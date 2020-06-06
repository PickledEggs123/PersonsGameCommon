/**
 * The game operates on a 4 hour, 240 minutes, 10 minute per hour basis. It is represented by a number that loops back
 * to repeat the entire start of the schedule. It is the number of milliseconds since midnight 12:00 am. Examples:
 *      0 -  60000 12 am to 1 am
 *  60000 - 120000  1 am to 2 am
 * 120000 - 180000  2 am to 3 am
 */
export type TDayNightTime = number;
/**
 * The length of one hour in day night time.
 */
export const TDayNightTimeHour: TDayNightTime = 60 * 10 * 1000;
/**
 * Get the current number of milliseconds from midnight in game time.
 */
export const getCurrentTDayNightTime = (time: Date = new Date()) => {
    const day = TDayNightTimeHour * 24;
    return +time % day;
};
