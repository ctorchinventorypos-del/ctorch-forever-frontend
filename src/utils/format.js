// Format a number as Naira, e.g. 1200 -> "₦1,200".
export const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
