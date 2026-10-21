/*
 * Thuật toán Âm - Dương Lịch Việt Nam chuẩn thiên văn (Hồ Ngọc Đức - Jean Meeus 1998)
 * Hỗ trợ múi giờ Việt Nam (UTC+7:00)
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AmLich = factory();
        root.convertSolar2Lunar = root.AmLich.convertSolar2Lunar;
        root.convertLunar2Solar = root.AmLich.convertLunar2Solar;
    }
}(typeof self !== 'undefined' ? self : this, function() {
    var PI = Math.PI;

    function INT(d) {
        return Math.floor(d);
    }

    function jdFromDate(dd, mm, yy) {
        var a, y, m, jd;
        a = INT((14 - mm) / 12);
        y = yy + 4800 - a;
        m = mm + 12 * a - 3;
        jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
        if (jd < 2299161) {
            jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
        }
        return jd;
    }

    function jdToDate(jd) {
        var a, b, c, d, e, m, day, month, year;
        if (jd > 2299160) {
            a = jd + 32044;
            b = INT((4 * a + 3) / 146097);
            c = a - INT((b * 146097) / 4);
        } else {
            b = 0;
            c = jd + 32082;
        }
        d = INT((4 * c + 3) / 1461);
        e = c - INT((1461 * d) / 4);
        m = INT((5 * e + 2) / 153);
        day = e - INT((153 * m + 2) / 5) + 1;
        month = m + 3 - 12 * INT(m / 10);
        year = b * 100 + d - 4800 + INT(m / 10);
        return [day, month, year];
    }

    function NewMoon(k) {
        var T, T2, T3, dr, Jd1, M, Mpr, F, C1, deltat, JdNew;
        T = k / 1236.85;
        T2 = T * T;
        T3 = T2 * T;
        dr = PI / 180;
        Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
        Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
        M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
        Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
        F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
        C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
        C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
        C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
        C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
        C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
        C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
        C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
        if (T < -11) {
            deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
        } else {
            deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
        }
        JdNew = Jd1 + C1 - deltat;
        return JdNew;
    }

    function SunLongitude(jdn) {
        var T, T2, dr, M, L0, DL, L;
        T = (jdn - 2451545.0) / 36525;
        T2 = T * T;
        dr = PI / 180;
        M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
        L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
        DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
        DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
        L = L0 + DL;
        L = L * dr;
        L = L - PI * 2 * (INT(L / (PI * 2)));
        return L;
    }

    function getSunLongitude(dayNumber, timeZone) {
        return INT(SunLongitude(dayNumber - 0.5 - timeZone / 24) / PI * 6);
    }

    function getNewMoonDay(k, timeZone) {
        return INT(NewMoon(k) + 0.5 + timeZone / 24);
    }

    function getLunarMonth11(yy, timeZone) {
        var k, off, nm, sunLong;
        off = jdFromDate(31, 12, yy) - 2415021;
        k = INT(off / 29.530588853);
        nm = getNewMoonDay(k, timeZone);
        sunLong = getSunLongitude(nm, timeZone);
        if (sunLong >= 9) {
            nm = getNewMoonDay(k - 1, timeZone);
        }
        return nm;
    }

    function getLeapMonthOffset(a11, timeZone) {
        var k, last, arc, i;
        k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
        last = 0;
        i = 1;
        arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
        do {
            last = arc;
            i++;
            arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
        } while (arc != last && i < 14);
        return i - 1;
    }

    function convertSolar2Lunar(dd, mm, yy, timeZone) {
        if (timeZone === undefined) timeZone = 7.0;
        var k, dayNumber, monthStart, a11, b11, lunarDay, lunarMonth;
        var lunarYear, lunarLeap, diff, leapMonthDiff;
        dayNumber = jdFromDate(dd, mm, yy);
        k = INT((dayNumber - 2415021.076998695) / 29.530588853);
        monthStart = getNewMoonDay(k + 1, timeZone);
        if (monthStart > dayNumber) {
            monthStart = getNewMoonDay(k, timeZone);
        }
        a11 = getLunarMonth11(yy, timeZone);
        b11 = a11;
        if (a11 >= monthStart) {
            lunarYear = yy;
            a11 = getLunarMonth11(yy - 1, timeZone);
        } else {
            lunarYear = yy + 1;
            b11 = getLunarMonth11(yy + 1, timeZone);
        }
        lunarDay = dayNumber - monthStart + 1;
        diff = INT((monthStart - a11) / 29);
        lunarLeap = 0;
        lunarMonth = diff + 11;
        if (b11 - a11 > 365) {
            leapMonthDiff = getLeapMonthOffset(a11, timeZone);
            if (diff >= leapMonthDiff) {
                lunarMonth = diff + 10;
                if (diff == leapMonthDiff) {
                    lunarLeap = 1;
                }
            }
        }
        if (lunarMonth > 12) {
            lunarMonth = lunarMonth - 12;
        }
        if (lunarMonth >= 11 && diff < 4) {
            lunarYear -= 1;
        }
        return [lunarDay, lunarMonth, lunarYear, lunarLeap];
    }

    function convertLunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap, timeZone) {
        if (timeZone === undefined) timeZone = 7.0;
        if (lunarLeap === undefined) lunarLeap = 0;
        var k, a11, b11, off, leapOff, leapMonth, monthStart;
        if (lunarMonth < 11) {
            a11 = getLunarMonth11(lunarYear - 1, timeZone);
            b11 = getLunarMonth11(lunarYear, timeZone);
        } else {
            a11 = getLunarMonth11(lunarYear, timeZone);
            b11 = getLunarMonth11(lunarYear + 1, timeZone);
        }
        k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
        off = lunarMonth - 11;
        if (off < 0) {
            off += 12;
        }
        if (b11 - a11 > 365) {
            leapOff = getLeapMonthOffset(a11, timeZone);
            leapMonth = leapOff - 2;
            if (leapMonth < 0) {
                leapMonth += 12;
            }
            if (lunarLeap != 0 && lunarMonth != leapMonth) {
                return [0, 0, 0];
            } else if (lunarLeap != 0 || off >= leapOff) {
                off += 1;
            }
        }
        monthStart = getNewMoonDay(k + off, timeZone);
        return jdToDate(monthStart + lunarDay - 1);
    }

    function getDaysInLunarMonth(lunarMonth, lunarYear, lunarLeap) {
        if (lunarLeap === undefined) lunarLeap = 0;
        var solar = convertLunar2Solar(30, lunarMonth, lunarYear, lunarLeap, 7.0);
        if (!solar || solar[0] === 0) return 29;
        var back = convertSolar2Lunar(solar[0], solar[1], solar[2], 7.0);
        if (back[0] === 30 && back[1] === lunarMonth && back[3] === lunarLeap) {
            return 30;
        }
        return 29;
    }

    var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
    var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

    function getYearCanChi(year) {
        return CAN[(year + 6) % 10] + ' ' + CHI[(year + 8) % 12];
    }

    function getDayCanChi(dd, mm, yy) {
        var jd = jdFromDate(dd, mm, yy);
        return CAN[(jd + 9) % 10] + ' ' + CHI[(jd + 1) % 12];
    }

    /**
     * Kiểm tra xem ngày Dương lịch (dd, mm, yyyy) có phải là ngày Phóng Sanh chính thức hay không:
     * ĐIỀU KIỆN TIÊN QUYẾT:
     * 1. Phải là ngày CHỦ NHẬT (getDay() === 0).
     * 2. Phải là ngày Chủ Nhật đầu tiên tính từ sau ngày 15 Âm lịch (Rằm) của tháng Âm lịch tương ứng (ngày 16 đến ngày 22 ÂL).
     * 3. Tuyệt đối KHÔNG phát sinh vào ngày 01, 14, 15, 29, 30 ÂL.
     */
    function isOfficialPhongSanh(dd, mm, yyyy) {
        var dt = new Date(yyyy, mm - 1, dd);
        if (dt.getDay() !== 0) return false; // Bắt buộc phải là ngày Chủ Nhật

        var lunar = convertSolar2Lunar(dd, mm, yyyy, 7.0);
        var lDay = lunar[0];
        var lMonth = lunar[1];
        var lYear = lunar[2];
        var lLeap = lunar[3];

        // Ngày Chủ Nhật đầu tiên sau ngày 15 ÂL bắt buộc phải nằm trong khoảng từ ngày 16 đến ngày 22 ÂL
        if (lDay < 16 || lDay > 22) return false;

        var ramSolar = convertLunar2Solar(15, lMonth, lYear, lLeap, 7.0);
        if (!ramSolar || ramSolar[0] === 0) return false;

        var dRam = new Date(ramSolar[2], ramSolar[1] - 1, ramSolar[0]);
        for (var offset = 1; offset <= 7; offset++) {
            var cand = new Date(dRam.getFullYear(), dRam.getMonth(), dRam.getDate() + offset);
            if (cand.getDay() === 0) {
                return (cand.getFullYear() === yyyy && (cand.getMonth() + 1) === mm && cand.getDate() === dd);
            }
        }
        return false;
    }

    /**
     * Tự động sinh danh sách sự kiện Âm lịch cho một tháng Dương lịch xác định:
     * - SÁM HỐI: Ngày 14 và ngày cuối tháng (29 hoặc 30 ÂL), khung giờ 16:00 - 20:00.
     * - PHÓNG SANH: DUY NHẤT VÀO NGÀY CHỦ NHẬT ĐẦU TIÊN SAU NGÀY 15 ÂM LỊCH, khung giờ 05:00 - 08:00.
     */
    function getLunarEventsForSolarMonth(solarYear, solarMonth) {
        var events = [];
        var daysInMonth = new Date(solarYear, solarMonth, 0).getDate();

        for (var day = 1; day <= daysInMonth; day++) {
            var lunar = convertSolar2Lunar(day, solarMonth, solarYear, 7.0);
            var lDay = lunar[0];
            var lMonth = lunar[1];
            var lYear = lunar[2];
            var lLeap = lunar[3];

            var leapStr = lLeap === 1 ? ' (Nhuận)' : '';
            var dateStr = solarYear + '-' + String(solarMonth).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            var totalLunarDays = getDaysInLunarMonth(lMonth, lYear, lLeap);

            // 1. Ngày 14 Âm lịch: SÁM HỐI (16:00 - 20:00)
            if (lDay === 14) {
                events.push({
                    id: 'lunar-sh-14-' + dateStr,
                    type: 'sam_hoi',
                    category: 'lunar',
                    title: 'Khóa Lễ Sám Hối (14/' + lMonth + leapStr + ' Âm lịch)',
                    date: dateStr,
                    startTime: '16:00',
                    endTime: '20:00',
                    lunarDay: lDay,
                    lunarMonth: lMonth,
                    lunarYear: lYear,
                    isLeap: lLeap,
                    isSamHoi: true,
                    description: 'Khóa Lễ Sám hối định kỳ 14 Âm lịch (16:00 - 20:00)'
                });
            }

            // 2. Ngày cuối tháng Âm lịch (29 nếu thiếu, 30 nếu đủ): SÁM HỐI (16:00 - 20:00)
            if (lDay === totalLunarDays) {
                var monthTypeStr = totalLunarDays === 30 ? 'Tháng đủ 30' : 'Tháng thiếu 29';
                events.push({
                    id: 'lunar-sh-end-' + dateStr,
                    type: 'sam_hoi',
                    category: 'lunar',
                    title: 'Khóa Lễ Sám Hối (Ngày ' + totalLunarDays + '/' + lMonth + leapStr + ' ÂL - ' + monthTypeStr + ')',
                    date: dateStr,
                    startTime: '16:00',
                    endTime: '20:00',
                    lunarDay: lDay,
                    lunarMonth: lMonth,
                    lunarYear: lYear,
                    isLeap: lLeap,
                    isSamHoi: true,
                    description: 'Khóa Lễ Sám hối cuối tháng Âm lịch (16:00 - 20:00)'
                });
            }

            // 3. Lễ PHÓNG SANH CHÍNH THỨC: CHỈ DUY NHẤT VÀO CHỦ NHẬT ĐẦU TIÊN SAU RẰM (15 ÂL) (05:00 - 08:00)
            if (isOfficialPhongSanh(day, solarMonth, solarYear)) {
                events.push({
                    id: 'lunar-ps-sun-ram-' + dateStr,
                    type: 'phong_sanh',
                    category: 'lunar',
                    title: 'Phóng Sanh (Chủ Nhật đầu tiên sau Rằm 15/' + lMonth + leapStr + ' ÂL)',
                    date: dateStr,
                    startTime: '05:00',
                    endTime: '08:00',
                    lunarDay: lDay,
                    lunarMonth: lMonth,
                    lunarYear: lYear,
                    isLeap: lLeap,
                    isSundayAfterRam: true,
                    description: 'Lễ Phóng sanh duy nhất trong tháng: diễn ra vào sáng Chủ Nhật đầu tiên sau ngày 15 Âm lịch (05:00 - 08:00)'
                });
            }
        }

        // Sắp xếp các sự kiện theo ngày và giờ bắt đầu
        events.sort(function(a, b) {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        });

        return events;
    }

    return {
        convertSolar2Lunar: convertSolar2Lunar,
        convertLunar2Solar: convertLunar2Solar,
        jdFromDate: jdFromDate,
        jdToDate: jdToDate,
        getDaysInLunarMonth: getDaysInLunarMonth,
        getYearCanChi: getYearCanChi,
        getDayCanChi: getDayCanChi,
        isOfficialPhongSanh: isOfficialPhongSanh,
        getLunarEventsForSolarMonth: getLunarEventsForSolarMonth
    };
}));
