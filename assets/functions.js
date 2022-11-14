import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

function timeUTC() {
  return dayjs.utc().format('HH:mm:ss');
}

export { timeUTC };
