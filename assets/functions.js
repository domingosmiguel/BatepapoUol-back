import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { stripHtml } from 'string-strip-html';

dayjs.extend(utc);

function timeUTC() {
  return dayjs.utc().format('HH:mm:ss');
}

function clearHTML(input) {
  let output = {};
  if (typeof input === 'object') {
    for (const key in input) {
      if ({}.hasOwnProperty.call(input, key)) {
        output[key] = stripHtml(input[key]).result;
      }
    }
  } else if (typeof input === 'string') {
    output = stripHtml(input).result;
  } else {
    output = '';
  }
  return output;
}

export { timeUTC, clearHTML };
