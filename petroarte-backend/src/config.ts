require("dotenv").config();

export const MONGO_URI: string = process.env.MONGO_URI || "";
export const PORT: number | string = process.env.PORT || 4000;