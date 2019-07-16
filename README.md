# 番剧订阅器

订阅「末日動漫資源庫」中的更新并自动打开 magnet 链接。

所以需要一个能用的 BT 下载工具（比如 [qbittorrent](https://github.com/qbittorrent/qBittorrent)），并且已经开启自动下载。

使用前先修改 `subscribe.json`：

```json
[
  {
    // 自定义 番剧名
    "name": "某科学的一方通行",
    // 关键词，下载依据
    "keywords": [
      "一方通行",
      "Accelerator"
    ],
    // 已经下载的话序号
    "got": [
      1
    ],

    // 下面是可选的，没有就表示没有强制要求
    // 数据可以是单个或者数组

    // 解析度 1080p | 720p
    "resolution": "1080p",
    // 文件类型 mp4 | mkv | flv
    "filetype": "mp4",
    // 字幕类型 zh_CN | zh_TW | en_US | ja_JP
    "language": "zh_CN",
  }
]
```

然后用 `node index.js` 来启动。

![mashiro](https://blog.swwind.me/img/shiina-mashiro.jpg)
