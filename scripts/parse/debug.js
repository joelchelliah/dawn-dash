/* eslint-disable */
/**
 * Shared debug configuration for the parse pipeline.
 *
 * The entry point (parse-event-trees.js) sets `eventName` from the --debug CLI flag;
 * the other modules read it to enable detailed per-event logging.
 */
const debugConfig = {
  eventName: '',
}

module.exports = { debugConfig }
