export const AVAILABLE_TICKERS = new Set(['AAPL', 'AMZN', 'MSFT', 'NFLX', 'GOOG', 'DDOG', 'NVDA', 'AMD']);
export const USERNAME = "honeykiwi"
export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF4567', '#FF8042', '#A28DFF'];

// export const TIME_INTERVALS = ["1HOUR", "1DAY", "5DAYS", "1MONTH", "6MONTHS", "YTD", "1YEAR", "5YEARS"]
// export const BUCKET_OPTIONS = {
//     "1HOUR": ["MINUTE"],
//     "1DAY": ["MINUTE", "HOUR"],
//     "5DAYS": ["HOUR", "DAY"],
//     "1MONTH": ["DAY", "WEEK"],
//     "6MONTHS": ["DAY", "WEEK", "MONTH"],
//     "YTD": ["DAY", "WEEK", "MONTH"],
//     "1YEAR": ["DAY", "WEEK", "MONTH"],
//     "5YEARS": ["WEEK", "MONTH"]
// }

export const TimeInterval = Object.freeze({
    ONE_HOUR: "1HOUR",
    ONE_DAY: "1DAY",
    FIVE_DAYS: "5DAYS",
    ONE_MONTH: "1MONTH",
    SIX_MONTHS: "6MONTHS",
    ONE_YEAR: "1YEAR",
    FIVE_YEARS: "5YEARS"
});

export const BucketInterval = Object.freeze({
    MINUTE: "MINUTE",
    HOUR: "HOUR",
    DAY: "DAY",
    WEEK: "WEEK",
    MONTH: "MONTH"
});

export const BUCKET_OPTIONS = Object.freeze({
    [TimeInterval.ONE_HOUR]: [BucketInterval.MINUTE],
    [TimeInterval.ONE_DAY]: [BucketInterval.MINUTE, BucketInterval.HOUR],
    [TimeInterval.FIVE_DAYS]: [BucketInterval.HOUR, BucketInterval.DAY],
    [TimeInterval.ONE_MONTH]: [BucketInterval.DAY, BucketInterval.WEEK],
    [TimeInterval.SIX_MONTHS]: [BucketInterval.DAY, BucketInterval.WEEK, BucketInterval.MONTH],
    [TimeInterval.ONE_YEAR]: [BucketInterval.DAY, BucketInterval.WEEK, BucketInterval.MONTH],
    [TimeInterval.FIVE_YEARS]: [BucketInterval.WEEK, BucketInterval.MONTH]
});