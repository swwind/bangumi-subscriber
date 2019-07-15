const chalk = require('chalk');

const log = (message) => {
  console.log(chalk.grey('info'), message);
}
const error = (message) => {
  console.log(chalk.red('error'), message);
}
const warn = (message) => {
  console.log(chalk.yellow('warning'), message);
}
const debug = (message) => {
  console.log(chalk.blue('debug'), message);
}

module.exports = {
  log, error, warn, debug
}
