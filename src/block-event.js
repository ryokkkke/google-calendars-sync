// classのstatic変数として定義したいけど、clasp pushで Syntax error: ParseError: Unexpected token = line: 2 file: src/block-event.gs と怒られる
const blockEventIdKeyPrefix = "BLOCK_EVENT_ID_BY_";
const propertySeparator = ":::::";
class BlockEvent {
  static generateBlockEventIdKey(originalEventId) {
    return `${blockEventIdKeyPrefix}${originalEventId}`;
  }

  static getBlockEventIds() {
    const blockEventIdKeys = scriptProperties.getKeys().filter((key) => key.startsWith(blockEventIdKeyPrefix));
    return blockEventIdKeys.map((key) => scriptProperties.getProperty(key));
  }

  static fetchFromCalendar(calendar, originalEvent) {
    const propertyKey = this.generateBlockEventIdKey(originalEvent.id);
    const property = scriptProperties.getProperty(propertyKey);
    const blockEventId = property && property.split(propertySeparator)[0];
    if (blockEventId == undefined) return console.log("couldn't find blockEventId.");

    const event = calendar.getEventById(blockEventId);
    if (event == undefined) return console.log("couldn't find a blockEvent.");

    // キーは残ってるけど実際には削除済みの可能性もあるので実在性を確認
    const blockEvent = new BlockEvent(event, originalEvent);
    if (!blockEvent.exists()) return console.log("a block event does not exist.");

    return blockEvent;
  }

  static deleteOldIdsIfNeeded() {
    const keys = scriptProperties.getKeys();
    if (keys.length < storedBlockEventsLimit) return;

    // 古いIDペアを削除
    const now = new Date();
    const blockEventIdKeys = keys.filter((key) => key.startsWith(blockEventIdKeyPrefix));
    blockEventIdKeys.forEach((key) => {
      const property = scriptProperties.getProperty(key);
      if (property == undefined) return;

      const [_, createdAtString] = property.split(propertySeparator);
      const createdAt = new Date(createdAtString);
      if (now - createdAt < deleteThresholdMilliSecond) return;

      scriptProperties.deleteProperty(key);
    });
  };

  constructor(calendarEvent, originalCalendarEvent) {
    this.calendarEvent = calendarEvent;
    this.originalCalendarEvent = originalCalendarEvent;
    this.propertyKey = BlockEvent.generateBlockEventIdKey(this.originalCalendarEvent.id);
  }

  // オリジナル予定のIDとブロック予定のIDを紐づける
  register() {
    const id = this.calendarEvent.getId();
    scriptProperties.setProperty(this.propertyKey, `${id}${propertySeparator}${new Date()}`);
    BlockEvent.deleteOldIdsIfNeeded();
  }

  unregister() {
    scriptProperties.deleteProperty(this.propertyKey);
  }

  delete() {
    // calendarEventは削除済みの予定でもstartTimeなどが取れてしまうこともあるため、削除済みの予定に対してdeleteEvent()した場合のエラーは握り潰す
    try {
      this.calendarEvent.deleteEvent();
      console.log(`deleted a block event.`);
    } catch(error) {
      if (error.message === "このカレンダーの予定は存在しないか、既に削除されています。") console.log("the block event has already been deleted.");
      else throw error;
    }
    // 削除した予定のIDをScriptPropertiesから削除
    this.unregister();
  }

  exists() {
    try {
      // TODO: これもしかしてgetTitle()だけでも良い？
      this.calendarEvent.setTitle(this.calendarEvent.getTitle());
      return true;
    } catch(error) {
      console.log(error);
      this.unregister();
      return false;
    }
  }

  getTimePair() {
    return [this.calendarEvent.getStartTime().getTime(), this.calendarEvent.getEndTime().getTime()];
  }

  updateTime(startTime, endTime) {
    this.calendarEvent.setTime(startTime, endTime);
  }
}
