
const https = require('https');
const { JSDOM } = require('jsdom');
const open = require('open');
const R = require('ramda');
const fs = require('fs').promises;
const notifier = require('node-notifier');
const console = require('./log');

const fetch = (url, options) => {
  options.headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36';
  return new Promise((resolve) => {
    https.get(url, options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        res.data = rawData;
        resolve(res);
      });
    });
  })
}

notifier.notify({
  title: 'Bangumi Subscriber',
  message: 'Bangumi Subscriber started successfully',
});

const trim = (str) => {
  return str.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
}

const fetchContent = async () => {
  // 第一轮访问，需要找到 cookie
  const status = await fetch('https://share.acgnx.se', {
    headers: { },
  });
  const set_cookie = Array.isArray(status.headers['set-cookie'])
    ?   status.headers['set-cookie']
    : [ status.headers['set-cookie'] ];
  const cookies = set_cookie.map((ck) => {
    return ck.split('; ')[0];
  });

  // 第二轮访问，会返回一个脚本，需要从中抽取第二份 cookie
  const scripts = await fetch('https://share.acgnx.se', {
    headers: {
      'Cookie': cookies.join('; ')
    }
  });
  const regres = scripts.data.match(/,('[^']+?'\.split\('[^']+?'\))/);
  const carr = eval(regres[1]);
  cookies.push(carr[24] + '=' + carr[20]);

  // 第三轮访问，应该正常返回数据
  const source = await fetch('https://share.acgnx.se/sort-1-1.html', {
    headers: {
      'Cookie': cookies.join('; ')
    }
  });

  console.log('fetched');

  const { document } = new JSDOM(source.data).window;
  const elems = Array.from(document.querySelectorAll('tbody#data_list tr'));
  const data = elems.map((elem) => {
    return {
      type: trim(elem.children[1].textContent),
      title: trim(elem.children[2].textContent),
      link: trim(elem.children[4].children[0].getAttribute('href')),
    }
  });

  return data;
}


const parseData = (data) => {
  const anime = data.filter(({ type }) => type === '動畫');
  return anime.map((video) => {
    video.keywords = video.title
      // 编码类，提前去除
      .replace(/Web-Dl|AVC|\d+bit|DDP|AAC|WebRip|x264|HEVC/gi, '')
      // 拆分关键字
      .split(/(?:【|】|「|」|\[|\]|\s|\/|,|，|。|!|！|\?|？|_|-|\.)/g)
      // 过滤空白
      .filter((c) => c.length);

    const extract = (reg) => {
      const res = video.keywords.filter((c) => reg.test(c));
      video.keywords = video.keywords.filter((c) => !reg.test(c));
      return res;
    }
    const anyMatch = (reg) => {
      return !!extract(reg).length;
    }

    video.zimuzu = extract(/^[\s\S]+(字幕|漢化|汉化|翻譯|翻译)(组|組|社)[\s\S]*$/);
    video.resolution = {
      '1080p': anyMatch(/1080/),
      '720p': anyMatch(/720/),
    };
    video.filetype = {
      'mp4': anyMatch(/MP4/i),
      'mkv': anyMatch(/MKV/i),
      'flv': anyMatch(/FLV/i),
    };
    const language = extract(/((简|簡|繁|体|體|日|中|英|语|語){2,3}|JAP|BIG5|GB|CHS|CHT|ENG)/i).join('');
    video.language = {
      'zh_CN': /(简|簡|GB|CHS)/i.test(language),
      'zh_TW': /(繁|BIG5|CHT)/i.test(language),
      'ja_JP': /(日|JAP)/i.test(language),
      'en_US': /(英|ENG)/i.test(language),
    };
    video.unstable = false;

    // console.log(video.title);
    if (!video.language.zh_CN && !video.language.zh_TW &&
        !video.language.ja_JP && !video.language.en_US) {
      console.warn('unknown language: ' + video.title);
      video.language.zh_CN = true;
      video.language.zh_TW = true;
      video.language.ja_JP = true;
      video.language.en_US = true;
    }

    const index = extract(/(\D|^)\d?\d\d(\.5)?(话|話|集|$)/g);
    if (index.length < 1) {
      console.error('unknown episode(movie?): ' + video.title);
      return null;
    } else if (index.length > 1) {
      console.error('multi episode: ' + video.title);
      return null;
    }
    video.episode = Number(index[0].match(/\d?\d\d(\.5)?/)[0]);
    
    return video;
  }).filter((c) => !!c);
}

const attachDownload = (name, video) => {
  notifier.notify({
    title: `「${name}」第 ${video.episode} 话更新了！`,
    message: '已经开始下载了',
    sound: true,
    wait: true,
  });
  open(video.link);
}

const toArray = (arr) => Array.isArray(arr) ? arr : [ arr ];
const arrMatch = (arr, obj) => R.any((key) => !!obj[key], arr);

const main = async () => {
  console.log('start update...');
  const subscribe = require('./subscribe.json');
  try {
    const data = await fetchContent();
    const anime = parseData(data);
    const used = R.sum(subscribe.map((sub) => {
      const resolution = sub.resolution ? toArray(sub.resolution) : ['1080p', '720p'];
      const filetype = sub.filetype ? toArray(sub.filetype) : ['mp4', 'mkv', 'flv'];
      const language = sub.language ? toArray(sub.language) : ['zh_CN', 'zh_TW', 'en_US', 'ja_JP'];
      return R.sum(anime.map((video) => {
        const match = R.any((word) => R.includes(word, video.title), sub.keywords);
        if (match &&
            !R.includes(video.episode, sub.got) &&
            arrMatch(resolution, video.resolution) &&
            arrMatch(filetype, video.filetype) &&
            arrMatch(language, video.language)) {
          attachDownload(sub.name, video);
          sub.got.push(video.episode);
          return 1;
        }
        return 0;
      }));
    }));

    console.log('saving...');

    await fs.writeFile('./subscribe.json', JSON.stringify(subscribe, null, 2));

    console.log(used ? `updated ${used} videos` : 'no update found');
    console.log('finished');

  } catch (e) {
    console.error(e);
  }
}

setInterval(main, 5 * 60 * 1000);
console.log('task started');
main();
