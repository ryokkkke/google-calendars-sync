class UpdatedCalendarEvent {
  constructor(userEmail, calendarEvent) {
    this.userEmail = userEmail;
    this.calendarEvent = calendarEvent;
    this.cachedGuests = {};
  }

  get isConfirmed() {
    return this.calendarEvent.status === "confirmed";
  }

  get isDeleted() {
    return this.calendarEvent.status === "cancelled";
  }

  get isAllDay() {
    if (!this.isConfirmed) return false;
    return this.calendarEvent.start.date != undefined;
  }

  get isOwned() {
    return this.calendarEvent.creator.email === this.userEmail;
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
    return BlockEvent.getBlockEventIds().includes(`${this.calendarEvent.id}@google.com`);
  }

  getGuest() {
    if (!this.cachedGuests.hasOwnProperty(this.userEmail)) {
      const guest = this.calendarEvent.attendees && this.calendarEvent.attendees.find((_guest) => _guest.email === this.userEmail);
      this.cachedGuests[this.userEmail] = guest;
    }

    return this.cachedGuests[this.userEmail];
  }

  // 削除した予定はIDしか取得できず、同じ時間帯の予定を探すことができない
  // ブロックイベントの作成時にオリジナルのIDとブロックイベントのIDをセットで保存しておき、後にオリジナルのIDからブロックイベントのIDを取得できるようにする
  fetchBlockEventFromCalendar(calendar) {
    return BlockEvent.fetchFromCalendar(calendar, this.calendarEvent);
  }

  createBlockEvent(calendar, summary) {
    const event = calendar
      .createEvent(summary, new Date(this.calendarEvent.start.dateTime), new Date(this.calendarEvent.end.dateTime))
      .setVisibility(CalendarApp.Visibility.PRIVATE);
    const blockEvent = new BlockEvent(event, this.calendarEvent);
    
    // オリジナル予定のIDとブロック予定のIDを紐づける
    blockEvent.register();

    return blockEvent;
  }
}
