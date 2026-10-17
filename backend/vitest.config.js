export default { test: { environment: 'node', testTimeout: 60000, hookTimeout: 120000, pool: 'forks', poolOptions: { forks: { singleFork: true } } } };
