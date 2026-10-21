/**
 * Lịch Cá Nhân Tích Hợp Lịch Âm, Lịch Dạy Học & Tính Lương MindX (Rank T0)
 * Logic chính của ứng dụng Single Page Application (PWA)
 */

// =========================================================================
// 1. STATE & STORAGE MANAGEMENT
// =========================================================================

const STORAGE_KEYS = {
    COURSES: 'amlich_teaching_courses',
    SESSIONS: 'amlich_teaching_sessions',
    PERSONAL: 'amlich_personal_events',
    FILTERS: 'amlich_calendar_filters',
    SALARY: 'amlich_salary_settings'
};

const state = {
    currentDate: new Date(),
    selectedDate: null,
    viewMode: 'month', // 'month' | 'week' | 'teach' | 'salary' | 'agenda'
    courses: [],
    sessions: [],
    personalEvents: [],
    filters: {
        phongSanh: true,
        samHoi: true,
        teaching: true,
        personal: true
    },
    salarySettings: {
        rank: 'T0',
        hourlyRate: 70000 // Mặc định Rank T0 MindX: 70.000đ/giờ
    },
    deferredPrompt: null
};

function initStorage() {
    try {
        state.courses = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES)) || [];
        state.sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS)) || [];
        state.personalEvents = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERSONAL)) || [];
        
        // Tự động dọn dẹp các sự kiện cũ trong LocalStorage nếu có lỡ lưu sự kiện Phóng sanh không chuẩn
        let cleaned = false;
        if (Array.isArray(state.personalEvents)) {
            const beforeLen = state.personalEvents.length;
            state.personalEvents = state.personalEvents.filter(p => {
                if (p.type === 'phong_sanh' || (p.title && p.title.toLowerCase().includes('phóng sanh'))) {
                    return false;
                }
                return true;
            });
            if (state.personalEvents.length !== beforeLen) cleaned = true;
        }
        if (Array.isArray(state.sessions)) {
            const beforeLen = state.sessions.length;
            state.sessions = state.sessions.filter(s => {
                if (s.type === 'phong_sanh' || (s.title && s.title.toLowerCase().includes('phóng sanh'))) {
                    return false;
                }
                return true;
            });
            if (state.sessions.length !== beforeLen) cleaned = true;
        }
        if (cleaned) {
            localStorage.setItem(STORAGE_KEYS.PERSONAL, JSON.stringify(state.personalEvents));
            localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions));
        }

        const savedFilters = JSON.parse(localStorage.getItem(STORAGE_KEYS.FILTERS));
        if (savedFilters) {
            state.filters = { ...state.filters, ...savedFilters };
        }

        const savedSalary = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALARY));
        if (savedSalary) {
            state.salarySettings = { ...state.salarySettings, ...savedSalary };
        }
    } catch (e) {
        console.error('Lỗi khi đọc LocalStorage:', e);
    }
}

function saveStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(state.courses));
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions));
        localStorage.setItem(STORAGE_KEYS.PERSONAL, JSON.stringify(state.personalEvents));
        localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(state.filters));
        localStorage.setItem(STORAGE_KEYS.SALARY, JSON.stringify(state.salarySettings));
    } catch (e) {
        console.error('Lỗi khi ghi LocalStorage:', e);
    }
}

// =========================================================================
// 2. HELPER FUNCTIONS & DATE UTILS
// =========================================================================

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 60 + parts[1];
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function calculateDurationHours(startTime, endTime) {
    const sMin = timeToMinutes(startTime);
    const eMin = timeToMinutes(endTime);
    if (eMin <= sMin) return 0;
    return (eMin - sMin) / 60;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatCurrencyShort(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(2).replace(/\.00$/, '') + ' tr';
    }
    if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'k';
    }
    return amount + 'đ';
}

function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseDateISO(dateStr) {
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateVN(dateStr) {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const DAY_NAMES = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getDayOfWeekName(date) {
    return DAY_NAMES[date.getDay()];
}

// =========================================================================
// 3. LOGIC TÍNH LƯƠNG MINDX (QUY CHẾ 3 ẢNH & RANK T0)
// =========================================================================

function calculateSessionSalary(session, hourlyRate) {
    if (!hourlyRate) hourlyRate = state.salarySettings.hourlyRate || 70000;
    const durationHours = calculateDurationHours(session.startTime, session.endTime);
    
    const role = session.role || 'LEC';
    const jobType = session.jobType || 'regular';
    const studentCount = Number(session.studentCount) || 1;
    let classModel = session.classModel;

    // Tự động suy luận classModel từ studentCount nếu chưa chọn
    if (!classModel) {
        if (studentCount === 1) classModel = 'model_1x';
        else if (studentCount <= 3) classModel = 'standard_le3';
        else classModel = 'standard_gt3';
    }

    const trialType = session.trialType || 'offline_normal';
    const trialStudents = Number(session.trialStudents) || studentCount || 1;

    let salary = 0;
    let ratePercent = 100;
    let noteDesc = '';

    if (jobType === 'trial') {
        switch (trialType) {
            case 'offline_normal':
                salary = 100000 + 20000 * trialStudents;
                noteDesc = `Trải nghiệm Offline (${trialStudents} HS: 100k + 20k*${trialStudents})`;
                break;
            case 'offline_cancel_none':
                salary = 0;
                noteDesc = 'Trải nghiệm Offline hủy: GV chưa đến (0đ)';
                break;
            case 'offline_cancel_arrived_50k':
                salary = 50000;
                noteDesc = 'Trải nghiệm Offline hủy: GV đã đến trực 30p (50.000đ)';
                break;
            case 'offline_cancel_full_80k':
                salary = 80000;
                noteDesc = 'Trải nghiệm Offline hủy: Trực đủ 3h (80.000đ)';
                break;
            case 'online_1hs_40k':
                salary = 40000;
                noteDesc = 'Trải nghiệm Online (1 HS: 40.000đ)';
                break;
            case 'online_2hs_60k':
                salary = 60000;
                noteDesc = 'Trải nghiệm Online (2 HS: 60.000đ)';
                break;
            case 'online_3hs_80k':
                salary = 80000;
                noteDesc = 'Trải nghiệm Online (3 HS: 80.000đ)';
                break;
            case 'online_cancel_40k':
                salary = 40000;
                noteDesc = 'Trải nghiệm Online hủy sát giờ (40.000đ)';
                break;
            default:
                salary = 50000;
                noteDesc = 'Ca trải nghiệm';
        }
        return {
            salary: Math.round(salary),
            durationHours,
            hourlyRate,
            ratePercent: null,
            noteDesc,
            isTrial: true
        };
    }

    if (jobType === 'makeup') {
        if (studentCount <= 3 || classModel === 'standard_le3') {
            ratePercent = 75;
            noteDesc = `Dạy bù (Sĩ số ${studentCount} HS ≤ 3: 75% lương)`;
        } else {
            ratePercent = 100;
            noteDesc = `Dạy bù (Sĩ số ${studentCount} HS > 3: 100% lương)`;
        }
        salary = (ratePercent / 100) * hourlyRate * durationHours;
        return {
            salary: Math.round(salary),
            durationHours,
            hourlyRate,
            ratePercent,
            noteDesc,
            isTrial: false
        };
    }

    // LỚP HỌC CHÍNH THỨC
    if (role === 'TA') {
        ratePercent = 75;
        noteDesc = `Trợ giảng TA (75% lương theo giờ)`;
    } else {
        if (classModel === 'model_1x' || studentCount === 1) {
            ratePercent = 100;
            noteDesc = `Giảng viên LEC - Lớp kèm 1-1, 1-2, 1-3 (100% lương)`;
        } else if (studentCount <= 3 || classModel === 'standard_le3') {
            ratePercent = 75;
            noteDesc = `Giảng viên LEC - Sĩ số ${studentCount} HS ≤ 3 (thiếu sĩ số: 75%)`;
        } else {
            ratePercent = 100;
            noteDesc = `Giảng viên LEC - Sĩ số ${studentCount} HS > 3 (100% lương)`;
        }
    }

    salary = (ratePercent / 100) * hourlyRate * durationHours;
    return {
        salary: Math.round(salary),
        durationHours,
        hourlyRate,
        ratePercent,
        noteDesc,
        isTrial: false
    };
}

function getMonthlySalarySummary(year, month) {
    const sessions = state.sessions.filter(sess => {
        const parts = sess.date.split('-').map(Number);
        return parts[0] === year && parts[1] === month;
    });

    let totalSalary = 0;
    let totalHours = 0;
    let totalSessions = sessions.length;
    let lecCount = 0;
    let taCount = 0;
    let trialCount = 0;
    let makeupCount = 0;

    const detailedSessions = sessions.map(sess => {
        const cal = calculateSessionSalary(sess, state.salarySettings.hourlyRate);
        totalSalary += cal.salary;
        totalHours += cal.durationHours;

        if (sess.jobType === 'trial') trialCount++;
        else if (sess.jobType === 'makeup') makeupCount++;
        else if (sess.role === 'TA') taCount++;
        else lecCount++;

        return {
            ...sess,
            salaryCalculation: cal
        };
    });

    detailedSessions.sort((a, b) => a.date.localeCompare(b.date));

    return {
        year,
        month,
        totalSalary,
        totalHours,
        totalSessions,
        lecCount,
        taCount,
        trialCount,
        makeupCount,
        sessions: detailedSessions
    };
}

// =========================================================================
// 4. CORE LOGIC: QUY TẮC ĐỆM 30 PHÚT & KIỂM TRA XUNG ĐỘT
// =========================================================================

function checkPairConflict(eventA, eventB) {
    const sA = timeToMinutes(eventA.startTime);
    const eA = timeToMinutes(eventA.endTime);
    const sB = timeToMinutes(eventB.startTime);
    const eB = timeToMinutes(eventB.endTime);

    const hasConflict = (sA < eB + 30) && (sB < eA + 30);
    if (!hasConflict) return null;

    const isDirectOverlap = (sA < eB) && (sB < eA);
    let gap = 0;
    let description = '';

    if (isDirectOverlap) {
        description = `Trùng giờ trực tiếp (${eventA.startTime} - ${eventA.endTime} và ${eventB.startTime} - ${eventB.endTime})`;
    } else if (sB >= eA) {
        gap = sB - eA;
        description = `Chỉ cách nhau ${gap} phút (kết thúc lúc ${eventA.endTime}, bắt đầu lúc ${eventB.startTime}). Yêu cầu cách tối thiểu 30 phút!`;
    } else {
        gap = sA - eB;
        description = `Chỉ cách nhau ${gap} phút (kết thúc lúc ${eventB.endTime}, bắt đầu lúc ${eventA.startTime}). Yêu cầu cách tối thiểu 30 phút!`;
    }

    return {
        hasConflict: true,
        isDirectOverlap,
        gap,
        description,
        eventA,
        eventB
    };
}

function validateEventConflicts(candidate, otherEventsInDay, ignoreId = null) {
    const conflicts = [];
    for (const ev of otherEventsInDay) {
        if (ignoreId && ev.id === ignoreId) continue;
        if (ev.date !== candidate.date) continue;

        const conflict = checkPairConflict(candidate, ev);
        if (conflict) {
            conflicts.push({
                conflictingWith: ev,
                isDirectOverlap: conflict.isDirectOverlap,
                gap: conflict.gap,
                description: conflict.description
            });
        }
    }
    return conflicts;
}

// =========================================================================
// 5. RETRIEVE ALL EVENTS
// =========================================================================

function getEventsForMonth(year, month) {
    const events = [];

    // 1. Lấy sự kiện Âm lịch
    if (window.AmLich && window.AmLich.getLunarEventsForSolarMonth) {
        const lunarEvts = window.AmLich.getLunarEventsForSolarMonth(year, month);
        lunarEvts.forEach(ev => {
            if (ev.type === 'phong_sanh' && state.filters.phongSanh) {
                events.push(ev);
            } else if (ev.type === 'sam_hoi' && state.filters.samHoi) {
                events.push(ev);
            }
        });
    }

    // 2. Lấy các buổi dạy học kèm tiền lương
    if (state.filters.teaching) {
        state.sessions.forEach(sess => {
            const parts = sess.date.split('-').map(Number);
            if (parts[0] === year && parts[1] === month) {
                const cal = calculateSessionSalary(sess, state.salarySettings.hourlyRate);
                events.push({
                    ...sess,
                    category: 'teaching',
                    salaryInfo: cal
                });
            }
        });
    }

    // 3. Lấy sự kiện cá nhân
    if (state.filters.personal) {
        state.personalEvents.forEach(p => {
            const parts = p.date.split('-').map(Number);
            if (parts[0] === year && parts[1] === month) {
                events.push({
                    ...p,
                    category: 'personal'
                });
            }
        });
    }

    return events;
}

function getAllRawEventsForDate(dateStr) {
    const parts = dateStr.split('-').map(Number);
    const y = parts[0], m = parts[1], d = parts[2];
    const rawEvents = [];
    const dateObj = new Date(y, m - 1, d);

    if (window.AmLich && window.AmLich.convertSolar2Lunar) {
        const lunar = window.AmLich.convertSolar2Lunar(d, m, y, 7.0);
        const lDay = lunar[0], lMonth = lunar[1], lYear = lunar[2], lLeap = lunar[3];
        const leapStr = lLeap === 1 ? ' (Nhuận)' : '';
        const totalLunarDays = window.AmLich.getDaysInLunarMonth(lMonth, lYear, lLeap);

        // 14 ÂL: SÁM HỐI (16:00 - 20:00)
        if (lDay === 14) {
            rawEvents.push({
                id: `lunar-sh-14-${dateStr}`,
                type: 'sam_hoi',
                category: 'lunar',
                title: `Khóa Lễ Sám Hối (14/${lMonth}${leapStr} ÂL)`,
                date: dateStr,
                startTime: '16:00',
                endTime: '20:00',
                isSamHoi: true,
                description: 'Khóa Lễ Sám hối định kỳ 14 Âm lịch (16:00 - 20:00)'
            });
        }

        // Cuối tháng: 29 hoặc 30 ÂL: SÁM HỐI (16:00 - 20:00)
        if (lDay === totalLunarDays) {
            const mType = totalLunarDays === 30 ? 'Tháng đủ 30' : 'Tháng thiếu 29';
            rawEvents.push({
                id: `lunar-sh-end-${dateStr}`,
                type: 'sam_hoi',
                category: 'lunar',
                title: `Khóa Lễ Sám Hối (Ngày ${totalLunarDays}/${lMonth}${leapStr} ÂL - ${mType})`,
                date: dateStr,
                startTime: '16:00',
                endTime: '20:00',
                isSamHoi: true,
                description: `Khóa Lễ Sám hối cuối tháng (${mType})`
            });
        }

        // PHÓNG SANH: CHỈ DIỄN RA VÀO NGÀY CHỦ NHẬT ĐẦU TIÊN SAU NGÀY 15 ÂM LỊCH (05:00 - 08:00)
        // Tuyệt đối không phát sinh vào bất kỳ ngày nào khác
        const isPS = window.AmLich && window.AmLich.isOfficialPhongSanh
            ? window.AmLich.isOfficialPhongSanh(d, m, y)
            : false;

        if (isPS) {
            rawEvents.push({
                id: `lunar-ps-sun-ram-${dateStr}`,
                type: 'phong_sanh',
                category: 'lunar',
                title: `Phóng Sanh (Chủ Nhật đầu tiên sau Rằm 15/${lMonth}${leapStr} ÂL)`,
                date: dateStr,
                startTime: '05:00',
                endTime: '08:00',
                isSundayAfterRam: true,
                description: 'Lễ Phóng sanh duy nhất trong tháng: diễn ra vào sáng Chủ Nhật đầu tiên sau ngày 15 Âm lịch (05:00 - 08:00)'
            });
        }
    }

    // Lịch dạy học trong ngày
    state.sessions.forEach(sess => {
        if (sess.date === dateStr) {
            const cal = calculateSessionSalary(sess, state.salarySettings.hourlyRate);
            rawEvents.push({ ...sess, category: 'teaching', salaryInfo: cal });
        }
    });

    // Sự kiện cá nhân trong ngày
    state.personalEvents.forEach(p => {
        if (p.date === dateStr) {
            rawEvents.push({ ...p, category: 'personal' });
        }
    });

    rawEvents.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return rawEvents;
}

// =========================================================================
// 6. QUẢN LÝ LỊCH DẠY HỌC (TỰ ĐỘNG TẠO 14 TUẦN & TÍNH LƯƠNG)
// =========================================================================

function previewTeachingSchedule(courseData) {
    const { 
        title, 
        branch, 
        studentCount, 
        startDate, 
        dayOfWeek, 
        startTime, 
        endTime, 
        location, 
        note, 
        role, 
        jobType, 
        classModel, 
        trialType, 
        trialStudents 
    } = courseData;

    const startObj = parseDateISO(startDate);
    const targetDay = Number(dayOfWeek);

    let currentDayOfWeek = startObj.getDay();
    let diffDays = targetDay - currentDayOfWeek;
    if (diffDays < 0) {
        diffDays += 7;
    }
    const firstSessionDate = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate() + diffDays);

    const generatedSessions = [];
    const courseId = 'course-' + Date.now();

    for (let week = 1; week <= 14; week++) {
        const sessionDate = new Date(firstSessionDate.getFullYear(), firstSessionDate.getMonth(), firstSessionDate.getDate() + (week - 1) * 7);
        const dateStr = formatDateISO(sessionDate);
        const d = sessionDate.getDate();
        const m = sessionDate.getMonth() + 1;
        const y = sessionDate.getFullYear();

        let lunar = [0, 0, 0, 0];
        let totalLunarDays = 30;
        let isDay14OrEnd = false;
        let lunarDesc = '';

        if (window.AmLich && window.AmLich.convertSolar2Lunar) {
            lunar = window.AmLich.convertSolar2Lunar(d, m, y, 7.0);
            const lDay = lunar[0], lMonth = lunar[1], lYear = lunar[2], lLeap = lunar[3];
            totalLunarDays = window.AmLich.getDaysInLunarMonth(lMonth, lYear, lLeap);
            const leapStr = lLeap === 1 ? ' (N)' : '';
            lunarDesc = `${lDay}/${lMonth}${leapStr} ÂL`;

            if (lDay === 14 || lDay === totalLunarDays) {
                isDay14OrEnd = true;
            }
        }

        const sessionCandidate = {
            id: `${courseId}-w${week}`,
            courseId,
            courseTitle: title,
            branch: branch || 'MindX',
            studentCount: Number(studentCount) || 1,
            weekNumber: week,
            title: `${title} (Tuần ${week})`,
            date: dateStr,
            startTime,
            endTime,
            location: location || branch || 'Tại lớp học',
            note: note || '',
            role: role || 'LEC',
            jobType: jobType || 'regular',
            classModel: classModel || 'standard_gt3',
            trialType: trialType || 'offline_normal',
            trialStudents: Number(trialStudents) || Number(studentCount) || 1,
            lunarDay: lunar[0],
            lunarMonth: lunar[1],
            lunarYear: lunar[2],
            isLeap: lunar[3],
            isDay14OrEnd,
            lunarDesc
        };

        const salCal = calculateSessionSalary(sessionCandidate, state.salarySettings.hourlyRate);
        sessionCandidate.salaryInfo = salCal;

        const existingEventsInDay = getAllRawEventsForDate(dateStr);
        const conflicts = validateEventConflicts(sessionCandidate, existingEventsInDay);

        let samHoiConflict = null;
        if (isDay14OrEnd) {
            const samHoiDummy = {
                title: `Khóa Lễ Sám Hối (${lunar[0]} ÂL)`,
                startTime: '16:00',
                endTime: '20:00'
            };
            const shCheck = checkPairConflict(sessionCandidate, samHoiDummy);
            if (shCheck) {
                samHoiConflict = shCheck;
            }
        }

        let status = 'safe';
        let statusMessage = 'Lịch học an toàn';

        if (conflicts.length > 0 || samHoiConflict) {
            status = 'danger';
            const reasons = [];
            if (samHoiConflict) {
                reasons.push(`Xung đột lịch SÁM HỐI (16:00 - 20:00): ${samHoiConflict.description}`);
            }
            conflicts.forEach(c => {
                if (!c.conflictingWith.isSamHoi) {
                    reasons.push(`Xung đột với [${c.conflictingWith.title}]: ${c.description}`);
                }
            });
            statusMessage = reasons.join('; ');
        } else if (isDay14OrEnd) {
            status = 'warning';
            statusMessage = `Rơi vào ngày ${lunar[0]} ÂL (ngày Sám hối) nhưng khung giờ dạy an toàn (cách tối thiểu 30 phút)`;
        }

        sessionCandidate.status = status;
        sessionCandidate.statusMessage = statusMessage;
        sessionCandidate.conflicts = conflicts;
        sessionCandidate.samHoiConflict = samHoiConflict;

        generatedSessions.push(sessionCandidate);
    }

    return {
        course: {
            id: courseId,
            title,
            branch: branch || 'MindX',
            studentCount: Number(studentCount) || 1,
            startDate,
            dayOfWeek: targetDay,
            startTime,
            endTime,
            location: location || branch,
            note,
            role: role || 'LEC',
            jobType: jobType || 'regular',
            classModel: classModel || 'standard_gt3',
            trialType: trialType || 'offline_normal',
            trialStudents: Number(trialStudents) || Number(studentCount) || 1,
            weeksCount: 14,
            createdAt: new Date().toISOString()
        },
        sessions: generatedSessions
    };
}

// =========================================================================
// 7. TIME PRESETS & DURATION PILLS LOGIC (DESIGN TASTE FRONTEND)
// =========================================================================

/**
 * Đặt nhanh khung giờ ca học chuẩn
 */
function applyTimePreset(start, end) {
    const sInput = document.getElementById('teach-start-time');
    const eInput = document.getElementById('teach-end-time');
    if (sInput && eInput) {
        sInput.value = start;
        eInput.value = end;
        highlightActiveTimePreset(start, end);
        updateLiveSalaryEstimate();
    }
}

function highlightActiveTimePreset(start, end) {
    const buttons = document.querySelectorAll('.time-preset-btn');
    buttons.forEach(btn => {
        if (btn.dataset.start === start && btn.dataset.end === end) {
            btn.className = 'time-preset-btn px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-500 scale-[0.98]';
        } else {
            btn.className = 'time-preset-btn px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95';
        }
    });
}

/**
 * Đặt thời lượng nhanh (cộng dồn từ giờ bắt đầu)
 */
function applyDurationHours(hours) {
    const sInput = document.getElementById('teach-start-time');
    const eInput = document.getElementById('teach-end-time');
    if (!sInput || !eInput || !sInput.value) return;

    const sMin = timeToMinutes(sInput.value);
    const eMin = sMin + hours * 60;
    if (eMin <= 24 * 60) {
        eInput.value = minutesToTime(eMin);
        highlightActiveTimePreset(sInput.value, eInput.value);
        updateLiveSalaryEstimate();
    }
}

/**
 * Điều chỉnh số lượng học viên (+ / -)
 */
function changeStudentCount(delta) {
    const input = document.getElementById('teach-student-count');
    if (!input) return;
    let val = Number(input.value) || 1;
    val = Math.max(1, Math.min(50, val + delta));
    input.value = val;
    updateStudentCountBadge(val);
    updateLiveSalaryEstimate();
}

function updateStudentCountBadge(count) {
    const badge = document.getElementById('badge-student-feedback');
    if (!badge) return;

    const jobType = document.getElementById('teach-job-type')?.value || 'regular';
    if (jobType === 'trial') {
        badge.innerHTML = `🎯 Ca Trial: <b>${count} học viên</b> (Offline: 100k + ${formatCurrency(count * 20000)})`;
        badge.className = 'text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 block mt-1';
        return;
    }

    if (count === 1) {
        badge.innerHTML = `👤 Lớp 1-1: <b>Tính 100% lương theo giờ</b>`;
        badge.className = 'text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 block mt-1';
    } else if (count <= 3) {
        badge.innerHTML = `⚠️ Sĩ số ${count} HS (≤ 3): <b>Tính 75% lương theo giờ</b> (Thiếu sĩ số)`;
        badge.className = 'text-[11px] font-medium text-purple-800 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 block mt-1';
    } else {
        badge.innerHTML = `✅ Sĩ số ${count} HS (> 3): <b>Tính 100% lương theo giờ</b> (Đủ sĩ số)`;
        badge.className = 'text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 block mt-1';
    }
}

/**
 * Live Estimate thu nhập ngay trong form tạo lớp
 */
function updateLiveSalaryEstimate() {
    const sInput = document.getElementById('teach-start-time');
    const eInput = document.getElementById('teach-end-time');
    const roleInput = document.getElementById('teach-role');
    const jobTypeInput = document.getElementById('teach-job-type');
    const studentInput = document.getElementById('teach-student-count');
    const trialTypeInput = document.getElementById('teach-trial-type');
    const estimateEl = document.getElementById('live-salary-estimate-box');

    if (!sInput || !eInput || !estimateEl) return;

    const dummySession = {
        startTime: sInput.value,
        endTime: eInput.value,
        role: roleInput ? roleInput.value : 'LEC',
        jobType: jobTypeInput ? jobTypeInput.value : 'regular',
        studentCount: studentInput ? Number(studentInput.value) : 1,
        trialType: trialTypeInput ? trialTypeInput.value : 'offline_normal',
        trialStudents: studentInput ? Number(studentInput.value) : 1
    };

    const cal = calculateSessionSalary(dummySession, state.salarySettings.hourlyRate);
    const total14Weeks = cal.salary * 14;

    estimateEl.innerHTML = `
        <div class="flex items-center justify-between text-xs">
            <span class="text-slate-600">Thời lượng ca học: <b>${cal.durationHours.toFixed(1)} giờ</b></span>
            <span class="text-slate-600">Quy tắc: <b>${cal.noteDesc}</b></span>
        </div>
        <div class="flex items-baseline justify-between mt-1 pt-1 border-t border-emerald-200/60">
            <span class="font-bold text-slate-700 text-xs">Thu nhập 1 buổi: <b class="text-emerald-800 font-mono text-sm">${formatCurrency(cal.salary)}</b></span>
            <span class="font-extrabold text-emerald-900 text-xs">Dự toán 14 tuần: <b class="font-mono text-base text-emerald-800">${formatCurrency(total14Weeks)}</b></span>
        </div>
    `;
}

// =========================================================================
// 8. UI RENDERERS & EVENT HANDLERS
// =========================================================================

function setViewMode(mode) {
    state.viewMode = mode;
    ['month', 'week', 'teach', 'salary', 'agenda'].forEach(m => {
        const btn = document.getElementById(`tab-btn-${m}`);
        const view = document.getElementById(`view-${m}`);
        if (btn && view) {
            if (m === mode) {
                btn.className = 'px-3.5 py-2 rounded-xl text-sm font-semibold transition-all bg-emerald-800 text-white shadow-sm flex items-center gap-1.5 flex-shrink-0';
                view.classList.remove('hidden');
            } else {
                btn.className = 'px-3.5 py-2 rounded-xl text-sm font-medium transition-all text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/70 flex items-center gap-1.5 flex-shrink-0';
                view.classList.add('hidden');
            }
        }
    });

    renderCurrentView();
}

function renderCurrentView() {
    switch (state.viewMode) {
        case 'month':
            renderMonthCalendar();
            break;
        case 'week':
            renderWeekCalendar();
            break;
        case 'teach':
            renderTeachingCoursesList();
            break;
        case 'salary':
            renderMonthlySalaryView();
            break;
        case 'agenda':
            renderAgendaView();
            break;
    }
    updateSummaryStats();
}

function updateSummaryStats() {
    const curYear = state.currentDate.getFullYear();
    const curMonth = state.currentDate.getMonth() + 1;
    const events = getEventsForMonth(curYear, curMonth);

    const psCount = events.filter(e => e.type === 'phong_sanh').length;
    const shCount = events.filter(e => e.type === 'sam_hoi').length;
    const teachCount = events.filter(e => e.category === 'teaching').length;
    const personalCount = events.filter(e => e.category === 'personal').length;

    const elPs = document.getElementById('stat-ps-count');
    const elSh = document.getElementById('stat-sh-count');
    const elTeach = document.getElementById('stat-teach-count');
    const elPersonal = document.getElementById('stat-personal-count');

    if (elPs) elPs.textContent = psCount;
    if (elSh) elSh.textContent = shCount;
    if (elTeach) elTeach.textContent = teachCount;
    if (elPersonal) elPersonal.textContent = personalCount;

    const monthSal = getMonthlySalarySummary(curYear, curMonth);
    const elMonthSalary = document.getElementById('stat-month-salary');
    if (elMonthSalary) {
        elMonthSalary.textContent = formatCurrency(monthSal.totalSalary);
    }
}

// Render Calendar Tháng
function renderMonthCalendar() {
    const container = document.getElementById('calendar-grid');
    if (!container) return;
    container.innerHTML = '';

    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth() + 1;

    const monthTitleEl = document.getElementById('current-month-title');
    const lunarYearCanChi = window.AmLich ? window.AmLich.getYearCanChi(year) : '';
    if (monthTitleEl) {
        monthTitleEl.innerHTML = `Tháng ${month} / ${year} <span class="text-sm font-normal text-emerald-700 ml-2">(Năm ${lunarYearCanChi})</span>`;
    }

    const firstDayObj = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const prevDaysInMonth = new Date(year, month - 1, 0).getDate();

    let startDayOfWeek = firstDayObj.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const todayStr = formatDateISO(new Date());

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const prevDay = prevDaysInMonth - i;
        const cell = document.createElement('div');
        cell.className = 'min-h-[105px] md:min-h-[120px] p-2 bg-slate-50/60 rounded-xl border border-slate-100 opacity-40 text-slate-400 flex flex-col justify-between';
        cell.innerHTML = `
            <div class="flex justify-between items-center text-xs">
                <span class="font-semibold">${prevDay}</span>
            </div>
        `;
        container.appendChild(cell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;

        let lunarText = '';
        let isSpecialLunar = false;
        let specialIcon = '';
        if (window.AmLich) {
            const lunar = window.AmLich.convertSolar2Lunar(d, month, year, 7.0);
            const lDay = lunar[0], lMonth = lunar[1], lLeap = lunar[3];
            const totalDays = window.AmLich.getDaysInLunarMonth(lMonth, lunar[2], lLeap);

            if (lDay === 1) {
                lunarText = `<span class="font-bold text-slate-700">1/${lMonth}${lLeap ? 'N' : ''} ÂL</span>`;
                isSpecialLunar = true;
                specialIcon = '🗓️';
            } else if (lDay === 15) {
                lunarText = `<span class="font-bold text-amber-600">15 (Rằm)</span>`;
                isSpecialLunar = true;
                specialIcon = '🌕';
            } else if (lDay === 14) {
                lunarText = `<span class="font-semibold text-purple-700">14 ÂL</span>`;
                isSpecialLunar = true;
                specialIcon = '📿';
            } else if (lDay === totalDays) {
                lunarText = `<span class="font-bold text-purple-800">${totalDays} ÂL</span>`;
                isSpecialLunar = true;
                specialIcon = '🌙';
            } else {
                lunarText = `<span class="text-slate-400">${lDay}</span>`;
            }
        }

        const dayEvents = getAllRawEventsForDate(dateStr).filter(ev => {
            if (ev.type === 'phong_sanh' && !state.filters.phongSanh) return false;
            if (ev.type === 'sam_hoi' && !state.filters.samHoi) return false;
            if (ev.category === 'teaching' && !state.filters.teaching) return false;
            if (ev.category === 'personal' && !state.filters.personal) return false;
            return true;
        });

        let hasDayConflict = false;
        for (let i = 0; i < dayEvents.length; i++) {
            for (let j = i + 1; j < dayEvents.length; j++) {
                if (checkPairConflict(dayEvents[i], dayEvents[j])) {
                    hasDayConflict = true;
                    break;
                }
            }
            if (hasDayConflict) break;
        }

        const cell = document.createElement('div');
        cell.className = `min-h-[110px] md:min-h-[125px] p-2 bg-white rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-emerald-300 relative group ${
            isToday ? 'border-2 border-emerald-600 bg-emerald-50/20 shadow-sm' : hasDayConflict ? 'border-red-300 bg-red-50/20' : 'border-slate-200/80'
        }`;

        let eventsHtml = '';
        dayEvents.slice(0, 3).forEach(ev => {
            let badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
            let icon = '•';
            let extraMoney = '';

            if (ev.type === 'phong_sanh') {
                badgeBg = 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold';
                icon = '🕊️';
            } else if (ev.type === 'sam_hoi') {
                badgeBg = 'bg-purple-50 text-purple-800 border-purple-200 font-medium';
                icon = '📿';
            } else if (ev.category === 'teaching') {
                const isConflict = ev.status === 'danger' || hasDayConflict;
                badgeBg = isConflict
                    ? 'bg-red-50 text-red-700 border-red-200 font-medium animate-pulse'
                    : 'bg-blue-50 text-blue-800 border-blue-200';
                icon = isConflict ? '⚠️' : (ev.jobType === 'trial' ? '🎯' : '📚');
                if (ev.salaryInfo) {
                    extraMoney = `<span class="font-bold text-emerald-800 ml-auto font-mono text-[10px]">${formatCurrencyShort(ev.salaryInfo.salary)}</span>`;
                }
            } else if (ev.category === 'personal') {
                badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
                icon = '📌';
            }

            eventsHtml += `
                <div class="px-1.5 py-0.5 rounded-lg border text-[11px] flex items-center gap-1 ${badgeBg}" title="${ev.title} (${ev.startTime}-${ev.endTime}) - ${ev.branch || ''}">
                    <span>${icon}</span>
                    <span class="truncate">${ev.startTime} ${ev.title}</span>
                    ${extraMoney}
                </div>
            `;
        });

        if (dayEvents.length > 3) {
            eventsHtml += `
                <div class="text-[10px] text-slate-500 font-medium pl-1">
                    +${dayEvents.length - 3} sự kiện nữa...
                </div>
            `;
        }

        cell.innerHTML = `
            <div>
                <div class="flex justify-between items-center mb-1.5">
                    <div class="flex items-center gap-1.5">
                        <span class="text-sm md:text-base font-bold ${isToday ? 'text-emerald-800' : 'text-slate-800'}">${d}</span>
                        ${isToday ? '<span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-700 text-white uppercase tracking-wider">Hôm nay</span>' : ''}
                    </div>
                    <div class="text-xs flex items-center gap-0.5">
                        ${specialIcon ? `<span class="text-[11px]">${specialIcon}</span>` : ''}
                        ${lunarText}
                    </div>
                </div>
                <div class="space-y-1">
                    ${eventsHtml}
                </div>
            </div>
            ${hasDayConflict ? `
                <div class="mt-1 flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-100/80 px-1.5 py-0.5 rounded-md">
                    <span>⚠️</span>
                    <span>Xung đột 30p!</span>
                </div>
            ` : ''}
        `;

        cell.onclick = () => openDayDetailModal(dateStr);
        container.appendChild(cell);
    }

    const totalRendered = startDayOfWeek + daysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
        const cell = document.createElement('div');
        cell.className = 'min-h-[105px] md:min-h-[120px] p-2 bg-slate-50/60 rounded-xl border border-slate-100 opacity-40 text-slate-400 flex flex-col justify-between';
        cell.innerHTML = `
            <div class="flex justify-between items-center text-xs">
                <span class="font-semibold">${nextDay}</span>
            </div>
        `;
        container.appendChild(cell);
    }
}

// Render Calendar Tuần
function renderWeekCalendar() {
    const container = document.getElementById('week-timeline-container');
    if (!container) return;
    container.innerHTML = '';

    const curr = new Date(state.currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDays.push(d);
    }

    const weekTitleEl = document.getElementById('current-week-title');
    if (weekTitleEl) {
        weekTitleEl.textContent = `Tuần từ ${formatDateVN(formatDateISO(weekDays[0]))} đến ${formatDateVN(formatDateISO(weekDays[6]))}`;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-7 gap-3';

    weekDays.forEach(dObj => {
        const dateStr = formatDateISO(dObj);
        const isToday = dateStr === formatDateISO(new Date());
        const dayEvents = getAllRawEventsForDate(dateStr);

        let lunarInfo = '';
        if (window.AmLich) {
            const lunar = window.AmLich.convertSolar2Lunar(dObj.getDate(), dObj.getMonth() + 1, dObj.getFullYear(), 7.0);
            lunarInfo = `${lunar[0]}/${lunar[1]} ÂL`;
        }

        const col = document.createElement('div');
        col.className = `p-3 rounded-2xl border transition-all ${
            isToday ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600' : 'border-slate-200 bg-white'
        } flex flex-col min-h-[300px]`;

        let evListHtml = '';
        if (dayEvents.length === 0) {
            evListHtml = '<div class="text-xs text-slate-400 italic py-4 text-center">Không có lịch</div>';
        } else {
            dayEvents.forEach(ev => {
                let badgeColor = 'bg-slate-50 border-slate-200 text-slate-700';
                if (ev.type === 'phong_sanh') badgeColor = 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold';
                else if (ev.type === 'sam_hoi') badgeColor = 'bg-purple-50 border-purple-200 text-purple-800 font-medium';
                else if (ev.category === 'teaching') badgeColor = ev.status === 'danger' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-800';
                else if (ev.category === 'personal') badgeColor = 'bg-amber-50 border-amber-200 text-amber-800';

                let moneyTag = '';
                if (ev.salaryInfo) {
                    moneyTag = `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] font-mono">${formatCurrency(ev.salaryInfo.salary)}</span>`;
                }

                evListHtml += `
                    <div class="p-2.5 rounded-xl border ${badgeColor} text-xs space-y-1.5">
                        <div class="font-bold flex justify-between items-center">
                            <span>${ev.startTime} - ${ev.endTime}</span>
                            ${ev.isSamHoi ? '<span class="text-[10px] bg-purple-200/60 px-1 rounded">Sám Hối</span>' : ''}
                            ${ev.type === 'phong_sanh' ? '<span class="text-[10px] bg-emerald-200/60 px-1 rounded">Phóng Sanh</span>' : ''}
                        </div>
                        <div class="font-medium">${ev.title}</div>
                        ${ev.branch ? `<div class="text-[10px] text-slate-500">🏢 ${ev.branch} • ${ev.studentCount || 1} HS</div>` : ''}
                        ${moneyTag ? `<div class="pt-1 flex items-center justify-between border-t border-slate-200/60">${moneyTag}</div>` : ''}
                    </div>
                `;
            });
        }

        col.innerHTML = `
            <div class="pb-2 mb-2 border-b border-slate-100 flex justify-between items-baseline">
                <div>
                    <span class="font-bold text-sm text-slate-800">${getDayOfWeekName(dObj)}</span>
                    <span class="text-xs text-slate-500 ml-1">${dObj.getDate()}/${dObj.getMonth() + 1}</span>
                </div>
                <span class="text-[11px] font-semibold text-emerald-700">${lunarInfo}</span>
            </div>
            <div class="space-y-2 flex-1">
                ${evListHtml}
            </div>
            <button onclick="openDayDetailModal('${dateStr}')" class="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                + Thêm / Chi tiết
            </button>
        `;

        grid.appendChild(col);
    });

    container.appendChild(grid);
}

// Render View Bảng Tính Lương Tháng
function renderMonthlySalaryView() {
    const container = document.getElementById('salary-view-container');
    if (!container) return;
    container.innerHTML = '';

    const curYear = state.currentDate.getFullYear();
    const curMonth = state.currentDate.getMonth() + 1;
    const summary = getMonthlySalarySummary(curYear, curMonth);

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="p-6 bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 rounded-3xl text-white shadow-lg md:col-span-2 flex flex-col justify-between border border-emerald-700/50">
                <div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs uppercase tracking-wider font-bold text-emerald-200">TỔNG THU NHẬP THÁNG ${curMonth}/${curYear}</span>
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur">Rank ${state.salarySettings.rank}</span>
                    </div>
                    <div class="text-3xl md:text-5xl font-extrabold mt-3 tracking-tight font-mono text-emerald-300">
                        ${formatCurrency(summary.totalSalary)}
                    </div>
                    <p class="text-xs text-emerald-200/90 mt-2">Tính chuẩn theo quy chế MindX & Lương giờ Rank ${state.salarySettings.rank} (${formatCurrency(state.salarySettings.hourlyRate)}/h)</p>
                </div>
                <div class="pt-4 border-t border-emerald-700/60 mt-4 flex items-center justify-between text-xs text-emerald-100">
                    <span>Tổng giờ đứng lớp: <b class="font-mono text-sm">${summary.totalHours.toFixed(1)} giờ</b></span>
                    <span>Tổng ca dạy: <b class="font-mono text-sm">${summary.totalSessions} buổi</b></span>
                </div>
            </div>

            <div class="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ cấu buổi dạy</div>
                <div class="space-y-2 text-xs">
                    <div class="flex justify-between items-center p-1.5 rounded-lg bg-slate-50">
                        <span class="text-slate-600">👨‍🏫 Giảng viên LEC:</span>
                        <span class="font-bold text-slate-800">${summary.lecCount} buổi</span>
                    </div>
                    <div class="flex justify-between items-center p-1.5 rounded-lg bg-slate-50">
                        <span class="text-slate-600">🧑‍🏫 Trợ giảng TA:</span>
                        <span class="font-bold text-slate-800">${summary.taCount} buổi</span>
                    </div>
                    <div class="flex justify-between items-center p-1.5 rounded-lg bg-amber-50">
                        <span class="text-amber-800 font-medium">🎯 Ca Trải Nghiệm (Trial):</span>
                        <span class="font-bold text-amber-900">${summary.trialCount} buổi</span>
                    </div>
                    <div class="flex justify-between items-center p-1.5 rounded-lg bg-slate-50">
                        <span class="text-slate-600">🔄 Dạy bù (Make up):</span>
                        <span class="font-bold text-slate-800">${summary.makeupCount} buổi</span>
                    </div>
                </div>
                <div class="pt-2 text-[11px] text-slate-400 italic">
                    * Theo đúng bảng quy chế 3 ảnh
                </div>
            </div>

            <div class="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
                <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Cấu hình Rank & Lương giờ</div>
                <div>
                    <label class="block text-[11px] font-semibold text-slate-600 mb-1">Cấp bậc giảng viên:</label>
                    <select id="setting-rank-select" onchange="changeRankSetting(this.value)" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none">
                        <option value="T0" ${state.salarySettings.rank === 'T0' ? 'selected' : ''}>Rank T0 (70.000đ/h)</option>
                        <option value="T1" ${state.salarySettings.rank === 'T1' ? 'selected' : ''}>Rank T1 (90.000đ/h)</option>
                        <option value="T2" ${state.salarySettings.rank === 'T2' ? 'selected' : ''}>Rank T2 (100.000đ/h)</option>
                        <option value="custom" ${!['T0','T1','T2'].includes(state.salarySettings.rank) ? 'selected' : ''}>Tùy chỉnh mức lương...</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-semibold text-slate-600 mb-1">Mức lương theo giờ (VNĐ/h):</label>
                    <div class="flex items-center gap-1.5">
                        <input type="number" id="setting-hourly-rate" value="${state.salarySettings.hourlyRate}" step="5000" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold outline-none">
                        <button onclick="saveCustomHourlyRate()" class="px-3 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors">
                            Lưu
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3 p-6">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="font-bold text-base text-slate-800 flex items-center gap-2">
                    <span>📑</span>
                    <span>Bảng Kê Lương Chi Tiết Từng Buổi Trong Tháng ${curMonth}/${curYear}</span>
                </h3>
                <span class="text-xs text-slate-500 font-medium">${summary.sessions.length} ca trực & đứng lớp</span>
            </div>

            ${summary.sessions.length === 0 ? `
                <div class="p-12 text-center text-slate-400 italic">
                    Chưa có buổi dạy nào trong tháng ${curMonth}/${curYear}. Hãy bấm "Lớp Mới" để tạo lịch 14 tuần!
                </div>
            ` : `
                <div class="overflow-x-auto rounded-2xl border border-slate-200">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th class="p-3">Ngày dạy</th>
                                <th class="p-3">Khóa học / Chi nhánh</th>
                                <th class="p-3">Khung giờ</th>
                                <th class="p-3">Số giờ</th>
                                <th class="p-3">Vai trò & Sĩ số</th>
                                <th class="p-3">Quy tắc tính lương</th>
                                <th class="p-3 text-right">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${summary.sessions.map(s => {
                                const cal = s.salaryCalculation;
                                return `
                                    <tr class="hover:bg-slate-50/80 transition-colors">
                                        <td class="p-3 font-medium">${formatDateVN(s.date)} (${DAY_NAMES[parseDateISO(s.date).getDay()]})</td>
                                        <td class="p-3">
                                            <div class="font-bold text-slate-800">${s.courseTitle || s.title}</div>
                                            <div class="text-[11px] text-slate-500">🏢 ${s.branch || 'MindX'}</div>
                                        </td>
                                        <td class="p-3 font-mono">${s.startTime} - ${s.endTime}</td>
                                        <td class="p-3 font-mono font-bold">${cal.durationHours.toFixed(1)}h</td>
                                        <td class="p-3">
                                            <div class="flex items-center gap-1.5">
                                                <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                    s.jobType === 'trial' ? 'bg-amber-100 text-amber-800' :
                                                    s.role === 'TA' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                                                }">
                                                    ${s.jobType === 'trial' ? '🎯 Trial' : s.jobType === 'makeup' ? '🔄 Make up' : (s.role === 'TA' ? '🧑‍🏫 TA' : '👨‍🏫 LEC')}
                                                </span>
                                                <span class="text-slate-600 font-medium">${s.studentCount || 1} HS</span>
                                            </div>
                                        </td>
                                        <td class="p-3 text-slate-600">${cal.noteDesc}</td>
                                        <td class="p-3 text-right font-extrabold text-emerald-800 text-sm font-mono">
                                            ${formatCurrency(cal.salary)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot class="bg-emerald-50 text-emerald-950 font-bold border-t border-emerald-200 text-xs">
                            <tr>
                                <td colspan="3" class="p-3 text-left uppercase tracking-wider">TỔNG CỘNG THU NHẬP THÁNG ${curMonth}/${curYear}:</td>
                                <td class="p-3 font-mono text-sm">${summary.totalHours.toFixed(1)}h</td>
                                <td colspan="2"></td>
                                <td class="p-3 text-right font-black text-base text-emerald-800 font-mono">
                                    ${formatCurrency(summary.totalSalary)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `}
        </div>
    `;
}

function changeRankSetting(rank) {
    state.salarySettings.rank = rank;
    if (rank === 'T0') state.salarySettings.hourlyRate = 70000;
    else if (rank === 'T1') state.salarySettings.hourlyRate = 90000;
    else if (rank === 'T2') state.salarySettings.hourlyRate = 100000;
    
    saveStorage();
    renderCurrentView();
    showToast(`Đã chuyển sang Rank ${rank} (${formatCurrency(state.salarySettings.hourlyRate)}/giờ)`, 'success');
}

function saveCustomHourlyRate() {
    const input = document.getElementById('setting-hourly-rate');
    if (!input) return;
    const rate = Number(input.value);
    if (rate > 0) {
        state.salarySettings.hourlyRate = rate;
        saveStorage();
        renderCurrentView();
        showToast(`Đã lưu mức lương theo giờ: ${formatCurrency(rate)}/giờ!`, 'success');
    }
}

// Render Danh Sách Các Lớp Học Đã Tạo
function renderTeachingCoursesList() {
    const listContainer = document.getElementById('courses-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (state.courses.length === 0) {
        listContainer.innerHTML = `
            <div class="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <span class="text-4xl block mb-2">📚</span>
                <p class="font-bold text-slate-700">Chưa có lớp học nào được tạo.</p>
                <p class="text-xs text-slate-400 mt-1">Bấm nút "Lớp Mới" hoặc điền form bên trên để tự động tạo lịch 14 tuần và tính tiền lương!</p>
            </div>
        `;
        return;
    }

    state.courses.forEach(c => {
        const courseSessions = state.sessions.filter(s => s.courseId === c.id);
        const dangerSessions = courseSessions.filter(s => s.status === 'danger');
        const warnSessions = courseSessions.filter(s => s.status === 'warning');
        const safeSessions = courseSessions.filter(s => s.status === 'safe');

        let totalCourseSalary = 0;
        courseSessions.forEach(s => {
            const cal = calculateSessionSalary(s, state.salarySettings.hourlyRate);
            totalCourseSalary += cal.salary;
        });

        const card = document.createElement('div');
        card.className = 'p-6 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4';

        card.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-lg font-extrabold text-slate-800">${c.title}</span>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            c.jobType === 'trial' ? 'bg-amber-100 text-amber-800' :
                            c.role === 'TA' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                        }">
                            ${c.jobType === 'trial' ? '🎯 Ca Trial' : c.jobType === 'makeup' ? '🔄 Dạy bù' : (c.role === 'TA' ? '🧑‍🏫 Trợ Giảng TA' : '👨‍🏫 Giảng Viên LEC')}
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            👥 ${c.studentCount || 1} học viên
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            💰 ${formatCurrency(totalCourseSalary)} / 14 tuần
                        </span>
                    </div>
                    <div class="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-4">
                        <span>🏢 Chi nhánh: <b>${c.branch || 'MindX'}</b></span>
                        <span>📅 Khai giảng: <b>${formatDateVN(c.startDate)}</b></span>
                        <span>⏰ ${DAY_NAMES[c.dayOfWeek]} (${c.startTime} - ${c.endTime})</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 self-end md:self-auto">
                    <button onclick="toggleCourseSessionsTable('${c.id}')" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors">
                        Xem 14 buổi
                    </button>
                    <button onclick="deleteCourse('${c.id}')" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Xóa toàn bộ khóa học">
                        Xóa
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div class="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900">
                    <span class="font-extrabold text-lg block font-mono">${safeSessions.length}</span>
                    <span class="text-emerald-700 font-medium">Buổi an toàn</span>
                </div>
                <div class="p-2.5 rounded-2xl bg-purple-50 border border-purple-100 text-purple-900">
                    <span class="font-extrabold text-lg block font-mono">${warnSessions.length}</span>
                    <span class="text-purple-700 font-medium">Trùng 14/30 ÂL (Giờ an toàn)</span>
                </div>
                <div class="p-2.5 rounded-2xl ${dangerSessions.length > 0 ? 'bg-red-50 border-2 border-red-300 text-red-800 font-bold' : 'bg-slate-50 text-slate-500'}">
                    <span class="font-extrabold text-lg block font-mono text-red-600">${dangerSessions.length}</span>
                    <span class="font-medium">Xung đột 30p</span>
                </div>
            </div>

            <div id="table-sessions-${c.id}" class="hidden pt-2">
                <div class="overflow-x-auto rounded-2xl border border-slate-200">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th class="p-3">Tuần</th>
                                <th class="p-3">Ngày Dương</th>
                                <th class="p-3">Ngày Âm</th>
                                <th class="p-3">Khung giờ</th>
                                <th class="p-3">Tiền lương</th>
                                <th class="p-3">Trạng thái (Đệm 30p)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${renderSessionsRows(courseSessions)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        listContainer.appendChild(card);
    });
}

function toggleCourseSessionsTable(courseId) {
    const el = document.getElementById(`table-sessions-${courseId}`);
    if (el) {
        el.classList.toggle('hidden');
    }
}

function renderSessionsRows(sessionsList) {
    return sessionsList.map(s => {
        let rowClass = 'hover:bg-slate-50/70 transition-colors';
        let badge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">An toàn</span>';

        if (s.status === 'danger') {
            rowClass = 'bg-red-50/90 text-red-950 border-l-4 border-l-red-500 font-medium';
            badge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white animate-pulse">⚠️ XUNG ĐỘT: ${s.statusMessage}</span>`;
        } else if (s.status === 'warning') {
            rowClass = 'bg-purple-50/40 text-purple-900 border-l-4 border-l-purple-400';
            badge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800">📿 ${s.statusMessage}</span>`;
        }

        const cal = s.salaryInfo || calculateSessionSalary(s, state.salarySettings.hourlyRate);

        return `
            <tr class="${rowClass}">
                <td class="p-3 font-bold">Tuần ${s.weekNumber}</td>
                <td class="p-3">${formatDateVN(s.date)} (${DAY_NAMES[parseDateISO(s.date).getDay()]})</td>
                <td class="p-3">
                    <span class="font-semibold ${s.isDay14OrEnd ? 'text-purple-700 font-bold underline' : 'text-slate-600'}">
                        ${s.lunarDesc || s.lunarDay + ' ÂL'}
                    </span>
                </td>
                <td class="p-3 font-mono font-medium">${s.startTime} - ${s.endTime}</td>
                <td class="p-3 font-bold font-mono text-emerald-800">
                    ${formatCurrency(cal.salary)}
                    <span class="block text-[10px] text-slate-500 font-normal">${cal.noteDesc}</span>
                </td>
                <td class="p-3">${badge}</td>
            </tr>
        `;
    }).join('');
}

function deleteCourse(courseId) {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ 14 tuần của khóa học này không?')) {
        state.courses = state.courses.filter(c => c.id !== courseId);
        state.sessions = state.sessions.filter(s => s.courseId !== courseId);
        saveStorage();
        renderCurrentView();
        showToast('Đã xóa khóa học thành công!', 'info');
    }
}

// Render Agenda
function renderAgendaView() {
    const container = document.getElementById('agenda-list-container');
    if (!container) return;
    container.innerHTML = '';

    const curYear = state.currentDate.getFullYear();
    const curMonth = state.currentDate.getMonth() + 1;
    const events = getEventsForMonth(curYear, curMonth);

    if (events.length === 0) {
        container.innerHTML = `
            <div class="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p>Không có sự kiện nào trong tháng ${curMonth}/${curYear} phù hợp với bộ lọc.</p>
            </div>
        `;
        return;
    }

    const grouped = {};
    events.forEach(ev => {
        if (!grouped[ev.date]) grouped[ev.date] = [];
        grouped[ev.date].push(ev);
    });

    const sortedDates = Object.keys(grouped).sort();

    sortedDates.forEach(dateStr => {
        const dayEvs = grouped[dateStr];
        const dateObj = parseDateISO(dateStr);
        const dayCard = document.createElement('div');
        dayCard.className = 'p-5 bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-3';

        let lunarInfo = '';
        if (window.AmLich) {
            const l = window.AmLich.convertSolar2Lunar(dateObj.getDate(), dateObj.getMonth() + 1, dateObj.getFullYear(), 7.0);
            const totalDays = window.AmLich.getDaysInLunarMonth(l[1], l[2], l[3]);
            lunarInfo = `Ngày ${l[0]}/${l[1]} ÂL ${l[0] === 14 || l[0] === totalDays ? ' (Khóa Lễ Sám Hối)' : ''}`;
        }

        let evListHtml = '';
        dayEvs.forEach(ev => {
            let badgeBg = 'bg-slate-100 text-slate-700';
            let icon = '•';
            let extraMoney = '';

            if (ev.type === 'phong_sanh') { badgeBg = 'bg-emerald-100 text-emerald-900 font-bold'; icon = '🕊️'; }
            else if (ev.type === 'sam_hoi') { badgeBg = 'bg-purple-100 text-purple-800'; icon = '📿'; }
            else if (ev.category === 'teaching') { 
                badgeBg = 'bg-blue-100 text-blue-800'; 
                icon = ev.jobType === 'trial' ? '🎯' : '📚'; 
                if (ev.salaryInfo) {
                    extraMoney = `<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold font-mono text-xs">${formatCurrency(ev.salaryInfo.salary)}</span>`;
                }
            }
            else if (ev.category === 'personal') { badgeBg = 'bg-amber-100 text-amber-800'; icon = '📌'; }

            evListHtml += `
                <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div class="flex items-center gap-3">
                        <span class="text-lg">${icon}</span>
                        <div>
                            <div class="font-bold text-slate-800 text-sm">${ev.title}</div>
                            <div class="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span class="font-mono font-bold text-slate-700">${ev.startTime} - ${ev.endTime}</span>
                                ${ev.branch ? `<span>🏢 ${ev.branch}</span>` : ''}
                                ${ev.studentCount ? `<span>👥 ${ev.studentCount} HS</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        ${extraMoney}
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeBg}">
                            ${ev.category === 'lunar' ? (ev.type === 'phong_sanh' ? 'Phóng Sanh' : 'Sám Hối') : ev.category === 'teaching' ? (ev.jobType === 'trial' ? 'Trial' : 'Dạy Học') : 'Cá Nhân'}
                        </span>
                        ${ev.category === 'personal' ? `
                            <button onclick="deletePersonalEvent('${ev.id}')" class="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-colors text-xs" title="Xóa sự kiện">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        dayCard.innerHTML = `
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <div class="flex items-baseline gap-2">
                    <span class="font-extrabold text-slate-800 text-base">${getDayOfWeekName(dateObj)}, ${formatDateVN(dateStr)}</span>
                    <span class="text-xs font-semibold text-emerald-800">(${lunarInfo})</span>
                </div>
                <button onclick="openDayDetailModal('${dateStr}')" class="text-xs font-bold text-emerald-800 hover:underline">
                    Xem / Thêm mới
                </button>
            </div>
            <div class="space-y-2">
                ${evListHtml}
            </div>
        `;

        container.appendChild(dayCard);
    });
}

function deletePersonalEvent(eventId) {
    if (confirm('Bạn có chắc chắn muốn xóa sự kiện cá nhân này không?')) {
        state.personalEvents = state.personalEvents.filter(e => e.id !== eventId);
        saveStorage();
        renderCurrentView();
        showToast('Đã xóa sự kiện thành công!', 'info');
    }
}

// =========================================================================
// 9. MODAL CHI TIẾT NGÀY & THÊM SỰ KIỆN CÁ NHÂN
// =========================================================================

function openDayDetailModal(dateStr) {
    state.selectedDate = dateStr;
    const modal = document.getElementById('day-detail-modal');
    if (!modal) return;

    const dateObj = parseDateISO(dateStr);
    const dayCanChi = window.AmLich ? window.AmLich.getDayCanChi(dateObj.getDate(), dateObj.getMonth() + 1, dateObj.getFullYear()) : '';
    const lunar = window.AmLich ? window.AmLich.convertSolar2Lunar(dateObj.getDate(), dateObj.getMonth() + 1, dateObj.getFullYear(), 7.0) : [1, 1, 2026, 0];
    const totalDays = window.AmLich ? window.AmLich.getDaysInLunarMonth(lunar[1], lunar[2], lunar[3]) : 30;

    document.getElementById('modal-date-title').textContent = `${getDayOfWeekName(dateObj)}, ngày ${formatDateVN(dateStr)}`;
    document.getElementById('modal-lunar-title').textContent = `Ngày ${lunar[0]} tháng ${lunar[1]} ÂL (Ngày ${dayCanChi}) ${lunar[0] === 14 || lunar[0] === totalDays ? '• Ngày Khóa Lễ Sám Hối' : ''}`;

    document.getElementById('personal-event-date').value = dateStr;
    renderModalEventsList(dateStr);
    modal.classList.remove('hidden');
}

function closeDayDetailModal() {
    const modal = document.getElementById('day-detail-modal');
    if (modal) modal.classList.add('hidden');
    const alertBox = document.getElementById('personal-conflict-alert');
    if (alertBox) alertBox.classList.add('hidden');
}

function renderModalEventsList(dateStr) {
    const listEl = document.getElementById('modal-events-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const events = getAllRawEventsForDate(dateStr);

    if (events.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-slate-400 italic py-2">Chưa có sự kiện nào trong ngày này.</div>';
        return;
    }

    events.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between text-xs space-y-1';

        let typeBadge = '';
        let moneyTag = '';
        if (ev.type === 'phong_sanh') typeBadge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">Phóng Sanh (05:00 - 08:00)</span>';
        else if (ev.type === 'sam_hoi') typeBadge = '<span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">Sám Hối (16:00 - 20:00)</span>';
        else if (ev.category === 'teaching') {
            typeBadge = `<span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">${ev.jobType === 'trial' ? 'Ca Trial' : (ev.role === 'TA' ? 'Trợ Giảng TA' : 'Giảng Viên LEC')}</span>`;
            if (ev.salaryInfo) {
                moneyTag = `<span class="font-extrabold text-emerald-800 font-mono text-sm">${formatCurrency(ev.salaryInfo.salary)}</span> <span class="text-slate-500 font-normal">(${ev.salaryInfo.noteDesc})</span>`;
            }
        }
        else if (ev.category === 'personal') typeBadge = '<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">Cá Nhân</span>';

        item.innerHTML = `
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 text-sm">${ev.title}</span>
                    ${typeBadge}
                </div>
                <div class="text-slate-600 font-mono mt-1">⏰ Khung giờ: <b>${ev.startTime} - ${ev.endTime}</b></div>
                ${ev.branch ? `<div class="text-xs text-slate-500">🏢 Chi nhánh: <b>${ev.branch}</b> • Sĩ số: <b>${ev.studentCount || 1} HS</b></div>` : ''}
                ${moneyTag ? `<div class="mt-1.5 text-xs text-slate-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">💰 Lương: ${moneyTag}</div>` : ''}
            </div>
            ${ev.category === 'personal' ? `
                <button onclick="deletePersonalEvent('${ev.id}'); renderModalEventsList('${dateStr}');" class="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors">
                    Xóa
                </button>
            ` : ''}
        `;
        listEl.appendChild(item);
    });
}

function setupPersonalEventValidation() {
    const dateInput = document.getElementById('personal-event-date');
    const startInput = document.getElementById('personal-event-start');
    const endInput = document.getElementById('personal-event-end');
    const alertBox = document.getElementById('personal-conflict-alert');
    const submitBtn = document.getElementById('btn-submit-personal');

    function checkLive() {
        const date = dateInput.value;
        const start = startInput.value;
        const end = endInput.value;

        if (!date || !start || !end) {
            alertBox.classList.add('hidden');
            submitBtn.disabled = false;
            return;
        }

        const sMin = timeToMinutes(start);
        const eMin = timeToMinutes(end);

        if (eMin <= sMin) {
            alertBox.className = 'p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 block';
            alertBox.innerHTML = '<b>Lỗi thời gian:</b> Giờ kết thúc phải sau giờ bắt đầu!';
            submitBtn.disabled = true;
            return;
        }

        const candidate = {
            id: 'temp-personal',
            date,
            startTime: start,
            endTime: end,
            title: 'Sự kiện đang nhập'
        };

        const existingInDay = getAllRawEventsForDate(date);
        const conflicts = validateEventConflicts(candidate, existingInDay);

        if (conflicts.length > 0) {
            alertBox.className = 'p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 text-xs text-red-800 block space-y-1.5 shadow-sm';
            let conflictMsg = `
                <div class="font-bold text-red-700 flex items-center gap-1.5 text-sm">
                    <span>🚫</span>
                    <span>CẢNH BÁO XUNG ĐỘT (QUY TẮC ĐỆM 30 PHÚT)</span>
                </div>
                <p>Khung giờ <b>${start} - ${end}</b> vi phạm với các lịch sau trong ngày:</p>
                <ul class="list-disc list-inside space-y-1 pl-1">
            `;
            conflicts.forEach(c => {
                conflictMsg += `
                    <li>
                        <b>${c.conflictingWith.title}</b> (${c.conflictingWith.startTime} - ${c.conflictingWith.endTime}):
                        <span class="text-red-600 font-medium">${c.description}</span>
                    </li>
                `;
            });
            conflictMsg += `
                </ul>
                <p class="font-semibold text-red-800 mt-1">Vui lòng chọn khung giờ khác đảm bảo cách tối thiểu 30 phút!</p>
            `;
            alertBox.innerHTML = conflictMsg;
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            alertBox.className = 'p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 block';
            alertBox.innerHTML = '✅ <b>Hợp lệ:</b> Khung giờ an toàn, cách tất cả các sự kiện khác tối thiểu 30 phút.';
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    [dateInput, startInput, endInput].forEach(inp => {
        if (inp) {
            inp.addEventListener('input', checkLive);
            inp.addEventListener('change', checkLive);
        }
    });
}

function handleAddPersonalEvent(e) {
    e.preventDefault();
    const title = document.getElementById('personal-event-title').value.trim();
    const date = document.getElementById('personal-event-date').value;
    const startTime = document.getElementById('personal-event-start').value;
    const endTime = document.getElementById('personal-event-end').value;
    const location = document.getElementById('personal-event-location').value.trim();
    const note = document.getElementById('personal-event-note').value.trim();

    if (!title || !date || !startTime || !endTime) {
        alert('Vui lòng điền đầy đủ các thông tin bắt buộc!');
        return;
    }

    const candidate = {
        id: 'evt-' + Date.now(),
        title,
        date,
        startTime,
        endTime,
        location,
        note,
        createdAt: new Date().toISOString()
    };

    const existingInDay = getAllRawEventsForDate(date);
    const conflicts = validateEventConflicts(candidate, existingInDay);

    if (conflicts.length > 0) {
        alert('Không thể lưu! Khung giờ bị xung đột với sự kiện khác theo quy tắc 30 phút.');
        return;
    }

    state.personalEvents.push(candidate);
    saveStorage();
    renderCurrentView();
    renderModalEventsList(date);

    document.getElementById('personal-event-title').value = '';
    document.getElementById('personal-event-location').value = '';
    document.getElementById('personal-event-note').value = '';

    showToast('Đã thêm sự kiện cá nhân thành công!', 'success');
}

// =========================================================================
// 10. TẠO & XÁC NHẬN LỊCH DẠY HỌC 14 TUẦN
// =========================================================================

let pendingCourseData = null;

function handleGenerateTeachingSchedule(e) {
    e.preventDefault();
    const title = document.getElementById('teach-title').value.trim();
    const branch = document.getElementById('teach-branch').value.trim();
    const studentCount = document.getElementById('teach-student-count').value;
    const startDate = document.getElementById('teach-start-date').value;
    const dayOfWeek = document.getElementById('teach-day-of-week').value;
    const startTime = document.getElementById('teach-start-time').value;
    const endTime = document.getElementById('teach-end-time').value;
    const location = document.getElementById('teach-location').value.trim() || branch;
    const note = document.getElementById('teach-note').value.trim();

    const role = document.getElementById('teach-role').value;
    const jobType = document.getElementById('teach-job-type').value;
    const trialType = document.getElementById('teach-trial-type').value;

    if (!title || !startDate || dayOfWeek === '' || !startTime || !endTime) {
        alert('Vui lòng điền đầy đủ thông tin khóa học!');
        return;
    }

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        alert('Giờ kết thúc phải sau giờ bắt đầu!');
        return;
    }

    const result = previewTeachingSchedule({
        title,
        branch,
        studentCount,
        startDate,
        dayOfWeek,
        startTime,
        endTime,
        location,
        note,
        role,
        jobType,
        trialType,
        trialStudents: studentCount
    });

    pendingCourseData = result;

    const previewContainer = document.getElementById('teach-preview-container');
    const previewModal = document.getElementById('teach-preview-modal');
    if (!previewContainer || !previewModal) return;

    const dangerCount = result.sessions.filter(s => s.status === 'danger').length;

    let bannerHtml = '';
    if (dangerCount > 0) {
        bannerHtml = `
            <div class="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-900 space-y-1">
                <div class="font-bold text-sm flex items-center gap-2 text-red-700">
                    <span class="text-lg">⚠️</span>
                    <span>PHÁT HIỆN ${dangerCount} BUỔI HỌC BỊ XUNG ĐỘT (QUY TẮC 30 PHÚT)</span>
                </div>
                <p class="text-xs">
                    Có ${dangerCount} buổi học trùng hoặc cách giờ Sám hối / Phóng sanh / Sự kiện khác dưới 30 phút. Các dòng vi phạm được tô đỏ bên dưới.
                </p>
            </div>
        `;
    } else {
        bannerHtml = `
            <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3">
                <span class="text-2xl">🎉</span>
                <div>
                    <div class="font-bold text-sm text-emerald-800">TẤT CẢ 14 TUẦN ĐỀU AN TOÀN!</div>
                    <p class="text-xs text-emerald-700">Khung giờ dạy đã chọn hoàn toàn hợp lệ và cách các sự kiện tối thiểu 30 phút.</p>
                </div>
            </div>
        `;
    }

    previewContainer.innerHTML = `
        ${bannerHtml}
        <div class="overflow-x-auto rounded-2xl border border-slate-200 mt-4">
            <table class="w-full text-xs text-left">
                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                        <th class="p-3">Tuần</th>
                        <th class="p-3">Ngày Dương</th>
                        <th class="p-3">Ngày Âm</th>
                        <th class="p-3">Giờ dạy</th>
                        <th class="p-3">Tiền Lương Ước Tính</th>
                        <th class="p-3">Trạng thái (Đệm 30p)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${renderSessionsRows(result.sessions)}
                </tbody>
            </table>
        </div>
    `;

    previewModal.classList.remove('hidden');
}

function confirmSaveTeachingCourse() {
    if (!pendingCourseData) return;

    state.courses.push(pendingCourseData.course);
    state.sessions.push(...pendingCourseData.sessions);
    saveStorage();

    closeTeachPreviewModal();
    renderCurrentView();

    showToast(`Đã lưu thành công 14 tuần lịch dạy cho "${pendingCourseData.course.title}"!`, 'success');
    pendingCourseData = null;

    document.getElementById('teach-title').value = '';
    document.getElementById('teach-location').value = '';
    document.getElementById('teach-note').value = '';
}

function closeTeachPreviewModal() {
    const modal = document.getElementById('teach-preview-modal');
    if (modal) modal.classList.add('hidden');
}

// Bật tắt trường ca Trial linh hoạt
function setupTeachingFormDynamicFields() {
    const jobTypeSelect = document.getElementById('teach-job-type');
    const roleWrapper = document.getElementById('wrapper-teach-role');
    const trialTypeWrapper = document.getElementById('wrapper-teach-trial-type');
    const studentCountInput = document.getElementById('teach-student-count');

    function updateFields() {
        const val = jobTypeSelect.value;
        if (val === 'trial') {
            if (roleWrapper) roleWrapper.classList.add('hidden');
            if (trialTypeWrapper) trialTypeWrapper.classList.remove('hidden');
        } else {
            if (roleWrapper) roleWrapper.classList.remove('hidden');
            if (trialTypeWrapper) trialTypeWrapper.classList.add('hidden');
        }
        if (studentCountInput) updateStudentCountBadge(Number(studentCountInput.value));
        updateLiveSalaryEstimate();
    }

    if (jobTypeSelect) {
        jobTypeSelect.addEventListener('change', updateFields);
    }
    if (studentCountInput) {
        studentCountInput.addEventListener('input', () => {
            updateStudentCountBadge(Number(studentCountInput.value));
            updateLiveSalaryEstimate();
        });
    }

    ['teach-start-time', 'teach-end-time', 'teach-role', 'teach-trial-type'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateLiveSalaryEstimate);
    });

    updateFields();
}

// =========================================================================
// 11. EXPORT & IMPORT (JSON, iCAL .ICS)
// =========================================================================

function exportDataJSON() {
    const data = {
        courses: state.courses,
        sessions: state.sessions,
        personalEvents: state.personalEvents,
        salarySettings: state.salarySettings,
        exportedAt: new Date().toISOString(),
        version: '2.1'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lich_ca_nhan_backup_${formatDateISO(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file sao lưu JSON thành công!', 'success');
}

function importDataJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.courses && data.sessions) {
                state.courses = data.courses;
                state.sessions = data.sessions;
                state.personalEvents = data.personalEvents || [];
                if (data.salarySettings) state.salarySettings = data.salarySettings;
                saveStorage();
                renderCurrentView();
                showToast('Đã phục hồi dữ liệu từ file JSON thành công!', 'success');
            } else {
                alert('File JSON không hợp lệ!');
            }
        } catch (err) {
            alert('Lỗi khi đọc file: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function exportToICal() {
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Lich Am & Day Hoc//Antigravity SPA//VI',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Lịch Cá Nhân & Dạy Học'
    ];

    const curYear = state.currentDate.getFullYear();
    for (let m = 1; m <= 12; m++) {
        const events = getEventsForMonth(curYear, m);
        events.forEach(ev => {
            const startParts = ev.startTime.split(':');
            const endParts = ev.endTime.split(':');
            const dateParts = ev.date.split('-');

            const dtStart = `${dateParts[0]}${dateParts[1]}${dateParts[2]}T${startParts[0]}${startParts[1]}00`;
            const dtEnd = `${dateParts[0]}${dateParts[1]}${dateParts[2]}T${endParts[0]}${endParts[1]}00`;

            icsContent.push('BEGIN:VEVENT');
            icsContent.push(`UID:${ev.id || 'evt-' + Math.random()}@lichamdayhoc.local`);
            icsContent.push(`DTSTAMP:${dateParts[0]}${dateParts[1]}${dateParts[2]}T000000Z`);
            icsContent.push(`DTSTART:${dtStart}`);
            icsContent.push(`DTEND:${dtEnd}`);
            icsContent.push(`SUMMARY:${ev.title}`);
            const loc = ev.branch ? `${ev.branch} - ${ev.location || ''}` : ev.location || '';
            if (loc) icsContent.push(`LOCATION:${loc}`);
            let desc = ev.description || ev.statusMessage || '';
            if (ev.salaryInfo) desc += ` [Lương: ${formatCurrency(ev.salaryInfo.salary)}]`;
            icsContent.push(`DESCRIPTION:${desc}`);
            icsContent.push('END:VEVENT');
        });
    }

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lich_am_dayhoc_${curYear}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file .ics! Bạn có thể mở để thêm vào Google/Apple Calendar.', 'success');
}

// =========================================================================
// 12. TOAST NOTIFICATIONS & PWA INSTALL
// =========================================================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    let bgClass = 'bg-slate-900 text-white shadow-xl';
    if (type === 'success') bgClass = 'bg-emerald-800 text-white shadow-xl shadow-emerald-950/20';
    if (type === 'error') bgClass = 'bg-red-800 text-white shadow-xl shadow-red-950/20';

    toast.className = `fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 z-50 flex items-center gap-2 transform translate-y-0 opacity-100 ${bgClass}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${message}</span>`;

    setTimeout(() => {
        toast.className = 'fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 z-50 transform translate-y-10 opacity-0 pointer-events-none';
    }, 3500);
}

function setupPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker đăng ký thành công:', reg.scope))
                .catch(err => console.warn('Service Worker đăng ký thất bại:', err));
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        state.deferredPrompt = e;
        const installBtn = document.getElementById('btn-pwa-install');
        if (installBtn) {
            installBtn.classList.remove('hidden');
        }
    });

    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (state.deferredPrompt) {
                state.deferredPrompt.prompt();
                const choiceResult = await state.deferredPrompt.userChoice;
                if (choiceResult.outcome === 'accepted') {
                    showToast('Cảm ơn bạn đã cài đặt ứng dụng!', 'success');
                }
                state.deferredPrompt = null;
                installBtn.classList.add('hidden');
            }
        });
    }
}

// =========================================================================
// 13. INITIALIZATION & DOM BINDINGS
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initStorage();
    setupPWA();
    setupPersonalEventValidation();
    setupTeachingFormDynamicFields();

    const teachStartDateInput = document.getElementById('teach-start-date');
    const teachDaySelect = document.getElementById('teach-day-of-week');
    if (teachStartDateInput && teachDaySelect) {
        teachStartDateInput.addEventListener('change', (e) => {
            if (e.target.value) {
                const d = parseDateISO(e.target.value);
                teachDaySelect.value = d.getDay();
            }
        });
    }

    document.getElementById('btn-prev-month').addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        renderCurrentView();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        renderCurrentView();
    });

    document.getElementById('btn-today').addEventListener('click', () => {
        state.currentDate = new Date();
        renderCurrentView();
    });

    const btnFilter = document.getElementById('btn-filter-dropdown');
    const menuFilter = document.getElementById('filter-dropdown-menu');
    if (btnFilter) {
        btnFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFilterDropdown();
        });
    }
    if (menuFilter) {
        menuFilter.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    ['phongSanh', 'samHoi', 'teaching', 'personal'].forEach(filterKey => {
        const chk = document.getElementById(`filter-${filterKey}`);
        if (chk) {
            chk.checked = state.filters[filterKey];
            chk.addEventListener('change', (e) => {
                state.filters[filterKey] = e.target.checked;
                saveStorage();
                updateFilterBadgeCount();
                renderCurrentView();
            });
        }
    });

    updateFilterBadgeCount();

    const teachForm = document.getElementById('form-create-teaching');
    if (teachForm) teachForm.addEventListener('submit', handleGenerateTeachingSchedule);

    const personalForm = document.getElementById('form-add-personal');
    if (personalForm) personalForm.addEventListener('submit', handleAddPersonalEvent);

    const todayISO = formatDateISO(new Date());
    if (teachStartDateInput) teachStartDateInput.value = todayISO;
    const personalDateInput = document.getElementById('personal-event-date');
    if (personalDateInput) personalDateInput.value = todayISO;
    if (teachDaySelect) teachDaySelect.value = new Date().getDay();

    // Khởi tạo live estimate
    updateLiveSalaryEstimate();

    setViewMode('month');
});

// =========================================================================
// FILTER DROPDOWN CONTROLS (GLOBAL SCOPE)
// =========================================================================

function toggleFilterDropdown(forceState = null) {
    const menu = document.getElementById('filter-dropdown-menu');
    const chevron = document.getElementById('filter-chevron');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    const shouldOpen = forceState !== null ? forceState : isHidden;
    if (shouldOpen) {
        menu.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
    } else {
        menu.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
    }
}

function updateFilterBadgeCount() {
    const badge = document.getElementById('filter-badge-count');
    if (!badge) return;
    const activeCount = Object.values(state.filters).filter(Boolean).length;
    badge.textContent = activeCount;
    if (activeCount === 4) {
        badge.className = 'w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center';
    } else if (activeCount > 0) {
        badge.className = 'w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center';
    } else {
        badge.className = 'w-5 h-5 rounded-full bg-slate-400 text-white text-[10px] font-bold flex items-center justify-center';
    }
}

function selectAllFilters(checked = true) {
    ['phongSanh', 'samHoi', 'teaching', 'personal'].forEach(key => {
        state.filters[key] = checked;
        const chk = document.getElementById(`filter-${key}`);
        if (chk) chk.checked = checked;
    });
    saveStorage();
    updateFilterBadgeCount();
    renderCurrentView();
}

// Tự động đóng menu bộ lọc khi nhấp ra ngoài
document.addEventListener('click', (e) => {
    const menu = document.getElementById('filter-dropdown-menu');
    const btn = document.getElementById('btn-filter-dropdown');
    const chevron = document.getElementById('filter-chevron');
    if (menu && !menu.classList.contains('hidden')) {
        if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
            menu.classList.add('hidden');
            if (chevron) chevron.classList.remove('rotate-180');
        }
    }
});

// Gán toàn cục window để gọi được từ inline HTML onclick
window.toggleFilterDropdown = toggleFilterDropdown;
window.updateFilterBadgeCount = updateFilterBadgeCount;
window.selectAllFilters = selectAllFilters;
