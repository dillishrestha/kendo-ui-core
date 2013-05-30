kendo_module({
    id: "scheduler.dayview",
    name: "Scheduler Day View",
    category: "web",
    description: "The Scheduler Day View",
    depends: [ "core" ]
});

(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.ui,
        extend = $.extend,
        Widget = ui.Widget,
        MS_PER_MINUTE = 60000,
        MS_PER_DAY = 86400000,
        NS = ".kendoMultiDayView";

    function getDate(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    }

    var TODAY = getDate(new Date());

    var DAY_VIEW_EVENT_TEMPLATE = kendo.template('<div class="k-appointment" title="(#=kendo.format("{0:t} - {1:t}", start, end)#): #=title#" data-#=ns#uid="#=uid#"><div>' +
                '<dl>' +
                    '<dt>#=kendo.format("{0:t} - {1:t}", start, end)#</dt>' +
                    '<dd>${title}</dd>' +
                '</dl>' +
                '#if (showDelete) {#' +
                    '<a href="\\#" class="k-link" style="display:none"><span class="k-icon k-i-close"></span></a>' +
                '#}#' +
                //'<span class="k-icon k-resize-handle"></span>' +
                '</div></div>'),
        DAY_VIEW_ALL_DAY_EVENT_TEMPLATE = kendo.template('<div class="k-appointment" title="(#=kendo.format("{0:t}", start)#): #=title#" data-#=ns#uid="#=uid#"><div>' +
                '<dl><dd>${title}</dd></dl>' +
                '#if (showDelete) {#' +
                    '<a href="\\#" class="k-link" style="display:none"><span class="k-icon k-i-close"></span></a>' +
                '#}#' +
                //'<span class="k-icon k-resize-handle"></span>' +
            '</div></div>'),
        DATA_HEADER_TEMPLATE = kendo.template("#=kendo.toString(date, 'ddd M/dd')#");

    function toInvariantTime(date) {
        var staticDate = new Date(1980, 1, 1, 0, 0, 0);
        setTime(staticDate, getMilliseconds(date));
        return staticDate;
    }

    function getMilliseconds(date) {
        return date.getHours() * 60 * MS_PER_MINUTE + date.getMinutes() * MS_PER_MINUTE + date.getSeconds() * 1000 + date.getMilliseconds();
    }

    function executeTemplate(template, options, dataItem) {
        var settings = extend({}, kendo.Template, options.templateSettings),
            type = typeof(template),
            text = "";

        if (type === "function") {
            text = kendo.template(template, settings)(dataItem || {});
        } else if (type === "string") {
            text = template;
        }
        return text;
    }

    function setTime(date, time, ignoreDST) {
        var offset = date.getTimezoneOffset(),
            offsetDiff;

        date.setTime(date.getTime() + time);

        if (!ignoreDST) {
            offsetDiff = date.getTimezoneOffset() - offset;
            date.setTime(date.getTime() + offsetDiff * MS_PER_MINUTE);
        }
    }

    function isInTimeRange(value, min, max) {
        var msMin = getMilliseconds(min),
            msMax = getMilliseconds(max),
            msValue;

        if (!value || msMin == msMax) {
            return true;
        }

        if (min >= max) {
            max += MS_PER_DAY;
        }

        msValue = getMilliseconds(value);

        if (msMin > msValue) {
            msValue += MS_PER_DAY;
        }

        if (msMax < msMin) {
            msMax += MS_PER_DAY;
        }

        return msValue >= msMin && msValue <= msMax;
    }

    function isInDateRange(value, min, max) {
        var msMin = min.getTime(),
            msMax = max.getTime(),
            msValue;

        if (msMin >= msMax) {
            msMax += MS_PER_DAY;
        }

        msValue = value.getTime();

        return msValue >= msMin && msValue <= msMax;
    }
    function createTable(dates, cellAction) {
        var idx,
            length,
            html ='<table class="k-scheduler-table">';

        html += '<colgroup>' + (new Array(dates.length + 1).join('<col />')) + '</colgroup>';
        html += '<tbody><tr>';

        for (idx = 0, length = dates.length; idx < length; idx++) {
            html += cellAction(dates[idx]);
        }

        html += '</tr></tbody></table>';

        return html;
    }

    function rangeIndex(eventElement) {
        var index = $(eventElement).attr(kendo.attr("start-end-idx")).split("-");
        return {
            start: +index[0],
            end: +index[1]
        };
    }

    function eventsForSlot(elements, slotStart, slotEnd) {
        return elements.filter(function() {
            var event = rangeIndex(this);
            return (event.start >= slotStart && event.start <= slotEnd) || slotStart >= event.start && slotStart <= event.end;
        });
    }
    function createColumns(eventElements, isHorizontal) {
        var columns = [];

        eventElements.each(function() {
            var event = this,
                eventRange = rangeIndex(event),
                column;

            for (var j = 0, columnLength = columns.length; j < columnLength; j++) {
                var endOverlaps = isHorizontal ? eventRange.start > columns[j].end : eventRange.start >= columns[j].end;

                if (eventRange.start < columns[j].start || endOverlaps) {

                    column = columns[j];

                    if (column.end < eventRange.end) {
                        column.end = eventRange.end;
                    }

                    break;
                }
            }

            if (!column) {
                column = { start: eventRange.start, end: eventRange.end, events: [] };
                columns.push(column);
            }

            column.events.push(event);
        });

        return columns;
    }
    var MultiDayView = ui.SchedulerView.extend({
        init: function(element, options) {
            var that = this;

            ui.SchedulerView.fn.init.call(that, element, options);

            that.title = that.options.title || that.options.name;

            this._editable();
        },

        options: {
            name: "MultiDayView",
            selectedDateFormat: "{0:D}",
            allDaySlot: true,
            title: "",
            startTime: TODAY,
            endTime: TODAY,
            numberOfTimeSlots: 2,
            majorTick: 60,
            majorTickTimeTemplate: kendo.template("<em>#=kendo.toString(date, 't')#</em>"),
            minorTickTimeTemplate: "&nbsp;",
            eventTemplate: DAY_VIEW_EVENT_TEMPLATE,
            allDayEventTemplate: DAY_VIEW_ALL_DAY_EVENT_TEMPLATE,
            dateHeaderTemplate: DATA_HEADER_TEMPLATE,
            editable: true
        },

        events: ["remove", "add", "edit"],

        _editable: function() {
            var that = this;
            if (that.options.editable) {

                that.element.on("mouseover" + NS, ".k-appointment", function() {
                    $(this).find("a:has(.k-i-close)").show();
                }).on("mouseleave" + NS, ".k-appointment", function() {
                    $(this).find("a:has(.k-i-close)").hide();
                }).on("click" + NS, ".k-appointment a:has(.k-i-close)", function(e) {
                    that.trigger("remove", { container: $(this).closest(".k-appointment") });
                    e.preventDefault();
                });

                if (that.options.editable.create !== false) {
                    that.element.on("dblclick", ".k-scheduler-content td", function(e) {
                        var element = $(this);
                        that.trigger("add", { eventInfo: that._rangeToDates(element) });
                        e.preventDefault();
                    }).on("dblclick", ".k-scheduler-header-all-day td", function(e) {
                        var element = $(this);
                        that.trigger("add", { eventInfo: extend({ isAllDay: true }, that._rangeToDates(element)) });
                        e.preventDefault();
                    });
                }

                if (that.options.editable.update !== false) {
                    that.element.on("dblclick", ".k-appointment", function(e) {
                        that.trigger("edit", { container: $(this).closest(".k-appointment") });
                        e.preventDefault();
                    });
                }
            }
        },

        dateForTitle: function() {
            return kendo.format(this.options.selectedDateFormat, this.startDate, this.endDate);
        },

        _header: function(dates) {
            if (!this.timesHeader) {
                this.timesHeader = $('<div class="k-scheduler-times">' +
                        '<table class="k-scheduler-table">' +
                        '<colgroup> <col /> </colgroup>' +
                        '<tbody>' +
                            '<tr><th>&nbsp;</th></tr>' +
                            (this.options.allDaySlot ? '<tr><th>all day</th></tr>' : '') +
                        '</tbody>' +
                    '</table>' +
                '</div>');

                this.element.append(this.timesHeader);
            }

            this._renderDatesHeader(dates);
        },

        _footer: function() {
            if (!this.footer) {
                var html = '<div class="k-header k-scheduler-footer">&nbsp;';
                   // '<ul class="k-reset k-header k-toolbar"> <li>aaa</li></ul>';

                //TODO: Toolbar command

                html += "</div>";

                this.footer = $(html).appendTo(this.element);
            }
        },

        _renderDatesHeader: function(dates) {
            var that = this,
                header = that.element.find(".k-scheduler-header-wrap"),
                html,
                options = this.options,
                headerTemplate = that.options.dateHeaderTemplate,
                allDayHtml;

            if (!header.length) {
                header = $('<div class="k-scheduler-header-wrap"/>');

                $('<div class="k-scheduler-header k-state-default"/>')
//                    .css("padding-right", scrollbar)
                    .append(header)
                    .appendTo(that.element);
            } else {
                header.empty();
            }

            html = createTable(dates, function(date) {
                var content = '<th';
                content += (getDate(date).getTime() === getDate(TODAY).getTime() ? ' class="k-today"' : "");
                content += '>' + executeTemplate(headerTemplate, options, { date: date }) + '</th>';
                return content;
            });

            if (that.options.allDaySlot) {
                allDayHtml = createTable(dates, function(date) {
                    var content = '<td';
                    content += (getDate(date).getTime() === getDate(TODAY).getTime() ? ' class="k-today"' : "");
                    content += '>&nbsp;</td>';
                    return content;
                });

                that.allDayHeader = $(allDayHtml).addClass("k-scheduler-header-all-day");
            }

            that.datesHeader = header.append(html)
                                    .append(that.allDayHeader)
                                    .parent();
        },

        _forTimeRange: function(min, max, action, after) {
            min = toInvariantTime(min); //convert the date to 1/2/1980 and sets the time
            max = toInvariantTime(max);

            var that = this,
                msMin = getMilliseconds(min),
                msMax = getMilliseconds(max),
                msMajorInterval = that.options.majorTick * MS_PER_MINUTE,
                msInterval = msMajorInterval / that.options.numberOfTimeSlots || 1,
                start = new Date(+min),
                startDay = start.getDate(),
                msStart,
                idx = 0, length,
                html = "";

            length = MS_PER_DAY / msInterval;

            if (msMin != msMax) {
                if (msMin > msMax) {
                    msMax += MS_PER_DAY;
                }

                length = ((msMax - msMin) / msInterval);
            }

            length = Math.round(length);

            for (; idx < length; idx++) {
                html += action(start, idx % (msMajorInterval/msInterval) === 0);

                setTime(start, msInterval, false);
            }

            if (msMax) {
                msStart = getMilliseconds(start);
                if (startDay < start.getDate()) {
                    msStart += MS_PER_DAY;
                }

                if (msStart > msMax) {
                    start = new Date(+max);
                }
            }

            if (after) {
                html += after(start);
            }

            return html;
        },

        _times: function() {
            var that = this,
                options = that.options,
                start = options.startTime,
                end = options.endTime,
                majorTickTimeTemplate = options.majorTickTimeTemplate,
                minorTickTimeTemplate = options.minorTickTimeTemplate,
                template,
                html = '<div class="k-scheduler-times"><table class="k-scheduler-table"><colgroup><col /></colgroup><tbody>';

            html += this._forTimeRange(start, end, function(date, majorTick) {
                var content = "<tr><th>";

                if (majorTick) {
                   template = majorTickTimeTemplate;
                } else {
                   template = minorTickTimeTemplate;
                }

                content += executeTemplate(template, options, { date: date });
                content += "</th></tr>";

                return content;
            }, function(date) {
                return '<tr class="k-last"><th>' + executeTemplate(majorTickTimeTemplate, options, { date: date }) + '</th></tr>';
            });

            html += '</tbody></table></div>';

            this.times = $(html);
            this.element.append(this.times);
        },

        _content: function(dates) {
            var that = this,
                options = that.options,
                start = options.startTime,
                end = options.endTime,
                wrapper = this.element.find(".k-scheduler-content"),
                html = '<table class="k-scheduler-table">';

            if (!wrapper.length) {
                wrapper = $('<div class="k-scheduler-content"/>').appendTo(this.element);

                wrapper.bind("scroll" + NS, function () {
                    that.datesHeader.find(">.k-scheduler-header-wrap").scrollLeft(this.scrollLeft);
                    that.times.scrollTop(this.scrollTop);
                });

                var touchScroller = kendo.touchScroller(wrapper);
                if (touchScroller && touchScroller.movable) {

                    this._touchScroller = touchScroller;

                    wrapper = touchScroller.scrollElement;

                    touchScroller.movable.bind("change", function(e) {
                        that.datesHeader.find(">.k-scheduler-header-wrap").scrollLeft(-e.sender.x);
                        that.times.scrollTop(-e.sender.y);
                    });
                }

            } else {
                if (this._touchScroller) {
                    wrapper = this._touchScroller.scrollElement;
                }
                wrapper.empty();
            }

            html += '<colgroup>' + (new Array(dates.length + 1).join('<col />')) + '</colgroup>';
            html += '<tbody>';

            html += this._forTimeRange(start, end, function(date, majorTick) {
                var content = "",
                    idx,
                    length;

                content = '<tr' + (majorTick ? ' class="k-middle-row"' : "") + '>';

                for (idx = 0, length = dates.length; idx < length; idx++) {
                    content += "<td" + (getDate(dates[idx]).getTime() === getDate(TODAY).getTime() ? ' class="k-today"' : "") + ">";
                    content += "&nbsp;</td>";
                }

                content += "</tr>";
                return content;
            });

            html += '</tbody>';
            html += '</table>';

            this.content = wrapper.append(html);
        },

        _setContentHeight: function() {
            var that = this,
                toolbar = that.element.find(">.k-scheduler-toolbar"),
                height = that.element.innerHeight(),
                headerHeight = 0,
                scrollbar = kendo.support.scrollbar();

            if (toolbar.length) {
                height -= toolbar.outerHeight();
            }

            if (that.datesHeader) {
                headerHeight = that.datesHeader.outerHeight();
            }

            if (that.timesHeader && that.timesHeader.outerHeight() > headerHeight) {
                headerHeight = that.timesHeader.outerHeight();
            }

            if (headerHeight) {
                height -= headerHeight;
            }

            if (that.footer) {
                height -= that.footer.outerHeight();
            }

            var isSchedulerHeightSet = function(el) {
                var initialHeight, newHeight;
                if (el[0].style.height) {
                    return true;
                } else {
                    initialHeight = el.height();
                }

                el.height("auto");
                newHeight = el.height();

                if (initialHeight != newHeight) {
                    el.height("");
                    return true;
                }
                el.height("");
                return false;
            };

            if (isSchedulerHeightSet(that.element)) { // set content height only if needed
                if (height > scrollbar * 2) { // do not set height if proper scrollbar cannot be displayed
                    that.content.height(height);
                } else {
                    that.content.height(scrollbar * 2 + 1);
                }
                that.times.height(that.content.height());
            }
        },

        _setHeaderPadding: function() {
            var scrollbar = !kendo.support.kineticScrollNeeded ? kendo.support.scrollbar() : 0,
                content = this.content,
                datesHeader = this.datesHeader;

            if (content && content[0].offsetWidth - content[0].clientWidth > 0) {
                datesHeader.css("padding-right", scrollbar);
            }
        },

        _render: function(dates) {
            dates = dates || [];

            this._dates = dates;

            this.startDate = dates[0];
            this.endDate = dates[(dates.length - 1) || 0];

            this._header(dates);

            if (!(this.times && this.times.length)) {
                this._times();
            }

            this._content(dates);

            this._footer();

            this._setContentHeight();

            this._setHeaderPadding();
        },

        nextDate: function() {
            var end = new Date(this.endDate);
            setTime(end, MS_PER_DAY);
            return end;
        },

        previousDate: function() {
            var start = new Date(this.startDate);
            setTime(start, -MS_PER_DAY);
            return start;
        },

        renderGrid: function(selectedDate) {
            this._render([selectedDate]);
        },

        destroy: function() {
            var that = this;

            Widget.fn.destroy.call(this);

            if (that.content) {
                that.content
                    .add(that.times)
                    .add(that.timesHeader)
                    .add(that.datesHeader)
                    .add(that.footer)
                    .remove()
                    .empty();

                if (that._touchScroller) {
                    that._touchScroller.wrapper.remove();
                    that._touchScroller.destroy();
                }

                that.content = null;
                that.times = null;
                that.timesHeader = null;
                that.datesHeader = null;
                that.footer = null;
            }
        },

        _rangeToDates: function(cell) {
            var parentRow = cell.closest("tr"),
                tableRows = parentRow.closest("table").find("tr"),
                maxTimeSlotIndex = tableRows.length - 1,
                dateIndex = parentRow.find("td").index(cell),
                timeIndex = tableRows.index(parentRow),
                slotDate = this._slotIndexDate(dateIndex),
                slotEndDate;

            if (slotDate) {
                slotEndDate = new Date(slotDate);

                setTime(slotDate, this._slotIndexTime(timeIndex));
                setTime(slotEndDate, this._slotIndexTime(Math.min(timeIndex + 1, maxTimeSlotIndex)));

                return {
                    start: slotDate,
                    end: slotEndDate
                };
            }
            return null;
        },

        _slotIndexTime: function(index) {
            var options = this.options,
                startTime = getMilliseconds(options.startTime),
                timeSlotInterval = ((options.majorTick/options.numberOfTimeSlots) * MS_PER_MINUTE);

            return startTime + timeSlotInterval * index;
        },

        _slotIndexDate: function(index) {
            var idx,
                length,
                slots = this._dates || [],
                startTime = getMilliseconds(new Date(+this.options.startTime)),
                endTime = getMilliseconds(new Date(+this.options.endTime)),
                slotStart;

            if (startTime >= endTime) {
                endTime += MS_PER_DAY;
            }

            for (idx = 0, length = slots.length; idx < length; idx++) {
                slotStart = new Date(+slots[idx]);
                setTime(slotStart, startTime);

                if (index === idx) {
                    return slotStart;
                }
            }
            return null;
        },

        _timeSlotIndex: function(date) {
            var options = this.options,
                eventStartTime = getMilliseconds(date),
                startTime = getMilliseconds(options.startTime),
                timeSlotInterval = ((options.majorTick/options.numberOfTimeSlots) * MS_PER_MINUTE);

            return (eventStartTime - startTime) / (timeSlotInterval);
        },

        _dateSlotIndex: function(date) {
            var idx,
                length,
                slots = this._dates || [],
                startTime = getMilliseconds(new Date(+this.options.startTime)),
                endTime = getMilliseconds(new Date(+this.options.endTime)),
                slotStart,
                slotEnd;

            if (startTime >= endTime) {
                endTime += (MS_PER_DAY - MS_PER_MINUTE);
            }

            for (idx = 0, length = slots.length; idx < length; idx++) {
                slotStart = new Date(+slots[idx]);
                setTime(slotStart, startTime);
                slotEnd = new Date(+slots[idx]);
                setTime(slotEnd, endTime);

                if (date.getTime() >= slotStart.getTime() && date.getTime() <= slotEnd.getTime()) {
                    return idx;
                }
            }
            return -1;
        },

        _positionAllDayEvent: function(element, slots, startIndex, endIndex, slotWidth) {
            if (startIndex < 0) {
                startIndex = 0;
            }

            if (endIndex < 0) {
                endIndex = slots.length - 1;
            }

            var dateSlot = slots.eq(startIndex),
                numberOfSlots = Math.ceil(endIndex - startIndex),
                allDayEvents = this._getCollisionEvents(this.datesHeader.find(".k-appointment"), startIndex, endIndex).add(element),
                top = dateSlot.position().top,
                bottomOffset = 20,
                eventHeight = allDayEvents.length > 1 ? allDayEvents.first()[0].clientHeight : (dateSlot.height() - bottomOffset);

            element
                .css({
                    left: dateSlot.position().left,
                    width: slotWidth * (numberOfSlots + 1)
                });

            element.attr(kendo.attr("start-end-idx"), startIndex + "-" + endIndex);

            var columns = createColumns(allDayEvents, true);

            for (var idx = 0, length = columns.length; idx < length; idx++) {
                var columnEvents = columns[idx].events;

                for (var j = 0, eventLength = columnEvents.length; j < eventLength; j++) {
                    $(columnEvents[j]).css({
                        top: top + idx * eventHeight
                    });
                }
            }

            if (columns.length > 1) {
                slots.parent().height((eventHeight * columns.length) + bottomOffset);
            }
        },

        _arrangeColumns: function(element, dateSlotIndex, dateSlot) {
            var columns,
                eventRightOffset = 30,
                columnEvents,
                blockRange = rangeIndex(element),
                eventElements = this.content.children(".k-appointment[" + kendo.attr("slot-idx") + "=" + dateSlotIndex + "]"),
                slotEvents = this._getCollisionEvents(eventElements, blockRange.start, blockRange.end).add(element);

            columns = createColumns(slotEvents);

            var columnWidth = (dateSlot.width() - eventRightOffset) / columns.length;

            for (var idx = 0, length = columns.length; idx < length; idx++) {
                columnEvents = columns[idx].events;

                for (var j = 0, eventLength = columnEvents.length; j < eventLength; j++) {
                    $(columnEvents[j]).css({
                        width: columnWidth,
                        left: dateSlot[0].offsetLeft + idx * columnWidth
                    });
                }
            }
        },

        _positionEvent: function(event, element, slots, dateSlotIndex, slotHeight) {
            var startIndex = Math.max(Math.floor(this._timeSlotIndex(event.start)), 0),
                endIndex = Math.min(Math.ceil(this._timeSlotIndex(event.end)), slots.length),
                bottomOffset = (slotHeight * 0.10),
                timeSlot = slots.eq(Math.floor(startIndex)),
                dateSlot = timeSlot.children().eq(dateSlotIndex);

            element.css({
                    height: slotHeight * (Math.ceil(endIndex - startIndex) || 1) - bottomOffset,
                    top: timeSlot.position().top + this.content[0].scrollTop
                });

            element.attr(kendo.attr("slot-idx"), dateSlotIndex);
            element.attr(kendo.attr("start-end-idx"), startIndex + "-" + endIndex);

            this._arrangeColumns(element, dateSlotIndex, dateSlot);
       },

        _createEventElement: function(event, template) {
            var options = this.options,
                //formattedTime = kendo.format(options.eventTimeFormat, event.start, event.end),
                showDelete = options.editable && options.editable.destroy !== false;

            return $(template(extend({}, {
                ns: kendo.ns,
                showDelete: showDelete
            }, event)));
        },

        _isInTimeSlot: function(event) {
            var slotStartTime = this.options.startTime,
                slotEndTime = this.options.endTime;

            return isInTimeRange(event.start, slotStartTime, slotEndTime) ||
                isInTimeRange(event.end, slotStartTime, slotEndTime) ||
                isInTimeRange(slotStartTime, event.start, event.end) ||
                isInTimeRange(slotEndTime, event.start, event.end);
        },

        _isInDateSlot: function(event) {
            var slotStart = this.startDate,
                slotEnd = new Date(this.endDate.getTime() + MS_PER_DAY);

            return isInDateRange(event.start, slotStart, slotEnd) ||
                isInDateRange(event.end, slotStart, slotEnd) ||
                isInDateRange(slotStart, event.start, event.end) ||
                isInDateRange(slotEnd, event.start, event.end);
        },

        _getCollisionEvents: function(elements, start, end) {
            var idx,
                index,
                startIndex,
                endIndex;

            for (idx = elements.length-1; idx >= 0; idx--) {
                index = rangeIndex(elements[idx]);
                startIndex = index.start;
                endIndex = index.end;

                if (startIndex <= start && endIndex >= start) {
                    start = startIndex;
                    if (endIndex > end) {
                        end = endIndex;
                    }
                }
            }

            return eventsForSlot(elements, start, end);
        },

        renderEvents: function(events) {
            var options = this.options,
                eventTemplate = kendo.template(options.eventTemplate),
                allDayEventTemplate = kendo.template(options.allDayEventTemplate),
                timeSlots = this.content.find("tr"),
                allDaySlots = this.allDayHeader ? this.allDayHeader.find("td") : $(),
                allDayEventContainer = this.datesHeader.find(".k-scheduler-header-wrap"),
                slotHeight = Math.floor(this.content.find(">table:first").innerHeight() / timeSlots.length),
                slotWidth = this.datesHeader.find("table:first th:first").innerWidth(),
                eventTimeFormat = options.eventTimeFormat,
                event,
                idx,
                length;

            this.element.find(".k-appointment").remove();

            events = new kendo.data.Query(events).sort([{ field: "start", dir: "asc" },{ field: "end", dir: "desc" }]).toArray();

            for (idx = 0, length = events.length; idx < length; idx++) {
                event = events[idx];

                if (this._isInDateSlot(event)) {
                   var dateSlotIndex = this._dateSlotIndex(event.start),
                       endDateSlotIndex = this._dateSlotIndex(event.end),
                       isSameDayEvent = !event.isAllDay && event.end.getTime() - event.start.getTime() < MS_PER_DAY && this._isInTimeSlot(event),
                       container = isSameDayEvent ? this.content : allDayEventContainer,
                       element = this._createEventElement(event, isSameDayEvent ? eventTemplate : allDayEventTemplate);

                   if (isSameDayEvent && !event.isAllDay) {
                       if (dateSlotIndex === -1 && endDateSlotIndex > -1) {
                           dateSlotIndex = endDateSlotIndex;
                       }

                       this._positionEvent(event, element, timeSlots, dateSlotIndex, slotHeight, eventTimeFormat);
                   } else {
                       this._positionAllDayEvent(element, allDaySlots, dateSlotIndex, endDateSlotIndex, slotWidth);
                   }

                   element.appendTo(container);
                }
            }
        }
    });

    extend(true, ui, {
       MultiDayView: MultiDayView,
       DayView: MultiDayView.extend({
           options: {
               title: "Day"
           },
           name: "day"
       }),
       WeekView: MultiDayView.extend({
           options: {
               title: "Week",
               selectedDateFormat: "{0:D} - {1:D}"
           },
           name: "week",
           renderGrid: function(selectedDate) {
               var start = new Date(selectedDate),
               weekDay = selectedDate.getDay(),
               dates = [],
               idx, length;

               start.setDate(start.getDate() - weekDay);

               for (idx = 0, length = 7; idx < length; idx++) {
                   dates.push(new Date(+start));
                   setTime(start, MS_PER_DAY, true);
               }

               this._render(dates);
           }
       })
    });

})(window.kendo.jQuery);
