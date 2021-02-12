class NextSyncToken {
  constructor(calendarId) {
    this.calendarId = calendarId;
  }

  get() {
    // ScriptPropetiesから取得
    const nextSyncToken = scriptProperties.getProperty(`${nextSyncTokenKeyPrefix}${this.calendarId}`);
    if (nextSyncToken != undefined) return nextSyncToken

    // ScriptPropetiesにない場合は、カレンダーから取得
    const events = Calendar.Events.list(this.calendarId, {'timeMin': (new Date()).toISOString()});
    return events.nextSyncToken;
  }

  update(nextSyncToken) {
    scriptProperties.setProperty(`${nextSyncTokenKeyPrefix}${this.calendarId}`, nextSyncToken);
  }
}
