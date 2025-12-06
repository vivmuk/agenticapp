 import logger from '../../utils/logger';

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    level: 'info',
    add: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create logger with default configuration', () => {
    const winston = require('winston');
    
    expect(winston.createLogger).toHaveBeenCalledWith({
      level: 'info',
      format: expect.any(Object),
      defaultMeta: { service: 'agentic-app' },
      transports: expect.arrayContaining([
        expect.any(Object), // File transport for errors
        expect.any(Object)  // File transport for combined logs
      ])
    });
  });

  it('should use custom log level from environment', () => {
    const originalLogLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'debug';

    // Re-require to test with new environment
    delete require.cache[require.resolve('../../utils/logger')];
    require('../../utils/logger');

    const winston = require('winston');
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'debug' })
    );

    process.env.LOG_LEVEL = originalLogLevel;
  });

  it('should add console transport in non-production environment', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    delete require.cache[require.resolve('../../utils/logger')];
    require('../../utils/logger');

    const winston = require('winston');
    const mockLogger = winston.createLogger();
    expect(mockLogger.add).toHaveBeenCalledWith(
      expect.objectContaining({
        format: expect.any(Object)
      })
    );

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should not add console transport in production environment', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    delete require.cache[require.resolve('../../utils/logger')];
    require('../../utils/logger');

    const winston = require('winston');
    const mockLogger = winston.createLogger();
    expect(mockLogger.add).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should have required logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
}); 