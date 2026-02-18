export const ENV = {
    ownerOpenId: process.env.OWNER_OPEN_ID || '',
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
};
