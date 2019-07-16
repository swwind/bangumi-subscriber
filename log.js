const chalk = require('chalk');
const R = require('ramda');

const log = (message) => {
  console.log(chalk.grey('log'), message);
}
const error = (message) => {
  console.log(chalk.red('error'), message);
}
const warn = (message) => {
  console.log(chalk.yellow('warning'), message);
}
const debug = (message) => {
  if (R.contains('--debug', process.argv)) {
    console.log(chalk.blue('debug'), message);
  }
}
const info = (message) => {
  if (R.contains('--info', process.argv)) {
    console.log(chalk.green('info'), message);
  }
}

module.exports = {
  log, error, warn, debug, info
}
