import { output } from 'codeceptjs';

/**
 * Thin wrapper over CodeceptJS output so page/helper logs line up with steps.
 * `info` is always shown (with --steps), `debug` only with --debug/--verbose.
 */
export const log = {
  info(message) {
    output.print(`${' '.repeat(output.stepShift || 0)}      » ${message}`);
  },
  debug(message) {
    output.debug(message);
  },
  section(message) {
    output.say(message, 'cyan');
  },
};
