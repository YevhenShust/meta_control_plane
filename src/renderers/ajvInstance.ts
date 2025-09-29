import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export function createAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  // add custom time-span format HH:MM:SS
  const timeRe = new RegExp('^\\d{2}:\\d{2}:\\d{2}$');
  ajv.addFormat('time-span', timeRe);
  // backend sometimes calls this 'TimeSpan' — accept both
  ajv.addFormat('TimeSpan', timeRe);
  return ajv;
}
