class BlockEvent {

  static deleteOldIdsIfNeeded() {
    const keys = scriptProperties.getKeys();
    if (keys.length < storedBlockEventsLimit) return;

    // 予定を削除
    const now = new Date();
    const blockEventIdKeys = keys.filter((key) => key.startsWith(blockEventIdKeyPrefix));
    blockEventIdKeys.forEach((key) => {
      const property = scriptProperties.getProperty(key);
      if (property == undefined) return;

      const [_, createdAtString] = property.split(":::::");
      const createdAt = new Date(createdAtString);
      if (now - createdAt < deleteThresholdMilliSecond) return;

      scriptProperties.deleteProperty(key);
    });
  };


  constructor(calendarEvent, originalCalendarEvent) {
    this.calendarEvent = calendarEvent;
    this.originalCalendarEvent = originalCalendarEvent;
    this.propertyKey = generateBlockEventIdKey(this.originalCalendarEvent.id);
  }

  // オリジナル予定のIDとブロック予定のIDを紐づける
  register() {
    const id = this.calendarEvent.getId();
    scriptProperties.setProperty(this.propertyKey, `${id}:::::${new Date()}`);
    BlockEvent.deleteOldIdsIfNeeded();
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
    scriptProperties.deleteProperty(this.propertyKey);
  }

  exists() {
    try {
      // TODO: これもしかしてgetTitle()だけでも良い？
      this.calendarEvent.setTitle(blockEvent.getTitle());
      return true;
    } catch(error) {
      console.log(error);
      return false;
    }
  }
}
