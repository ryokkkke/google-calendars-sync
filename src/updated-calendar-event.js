class UpdatedCalendarEvent {
  // ここで渡ってくるcalendarEventはドキュメントに出てくるCalendarEventではない。
  // https://developers.google.com/apps-script/advanced/calendar#listing_events に出てくる、ドキュメントの無いオブジェクト...
  constructor(userEmail, advancedCalendarEvent) {
    this.userEmail = userEmail;
    this.advancedCalendarEvent = advancedCalendarEvent;
    this.cachedGuests = {};
  }

  get isConfirmed() {
    return this.advancedCalendarEvent.status === "confirmed";
  }

  get isDeleted() {
    return this.advancedCalendarEvent.status === "cancelled";
  }

  get isAllDay() {
    if (!this.isConfirmed) return false;
    return this.advancedCalendarEvent.start.date != undefined;
  }

  get isOwned() {
    return this.advancedCalendarEvent.creator.email === this.userEmail;
  }
  
  get isAttend() {
    if (this.isOwned) return true;
    if (!this.isConfirmed) return false;
    
    const guest = this.getGuest(this.userEmail);
    if (guest == undefined) return false;
    
    return attendingResponses.includes(guest.responseStatus);
  }
  
  get isDeclined() {
    const guest = this.getGuest();
    return this.isConfirmed && guest != undefined && guest.responseStatus === "declined";
  }
  
  get isBlockEvent() {
    // なぜかevent.getId()で返ってくるidには"@google.com"がつくので、検索時にも付与する
    // -- 削除した予定はIDしか取得できないので、summaryとprefixの一致では判断ができない
    // -- 更新された予定はsummaryがとれるので、prefixとの一致判定も一応入れておく
    if (this.advancedCalendarEvent.summary != undefined && this.advancedCalendarEvent.summary.startsWith(blockEventSummaryPrefix)) return true;
    return BlockEvent.getBlockEventIds().includes(`${this.advancedCalendarEvent.id}@google.com`);
  }

  get startTime() {
    return new Date(this.advancedCalendarEvent.start.dateTime);
  }

  get endTime() {
    return new Date(this.advancedCalendarEvent.end.dateTime);
  }

  getGuest() {
    if (!this.cachedGuests.hasOwnProperty(this.userEmail)) {
      const guest = this.advancedCalendarEvent.attendees && this.advancedCalendarEvent.attendees.find((_guest) => _guest.email === this.userEmail);
      this.cachedGuests[this.userEmail] = guest;
    }

    return this.cachedGuests[this.userEmail];
  }

  // 削除した予定はIDしか取得できず、同じ時間帯の予定を探すことができない
  // ブロックイベントの作成時にオリジナルのIDとブロックイベントのIDをセットで保存しておき、後にオリジナルのIDからブロックイベントのIDを取得できるようにする
  fetchBlockEventFromCalendar(calendar) {
    return BlockEvent.fetchFromCalendar(calendar, this.advancedCalendarEvent);
  }

  createBlockEvent(calendar, summary) {
    const event = calendar
      .createEvent(summary, this.startTime, this.endTime)
      .setVisibility(CalendarApp.Visibility.PRIVATE);
    const blockEvent = new BlockEvent(event, this.advancedCalendarEvent);
    
    // オリジナル予定のIDとブロック予定のIDを紐づける
    blockEvent.register();

    return blockEvent;
  }

  getTimePair() {
    return [this.startTime.getTime(), this.endTime.getTime()];
  }

  // arguments: BlockEvent
  isSameTime(blockEvent) {
    const timePair = this.getTimePair();
    const blockEventTimePair = blockEvent.getTimePair();
    return timePair[0] === blockEventTimePair[0] && timePair[1] === blockEventTimePair[1];
  }
}
