import path from 'node:path';

const config = {
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    async datasourceUrl() {
      return process.env.DATABASE_URL ?? 'postgresql://localhost:5432/ptsd_workplace';
    },
  },
};

export default config;
