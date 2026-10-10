"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultEmailProvider = exports.ConsoleEmailProvider = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'email-provider' });
class ConsoleEmailProvider {
    async sendEmail(options) {
        logger.info({
            to: options.to,
            subject: options.subject,
            preview: options.text || options.html.substring(0, 100)
        }, '[DEV EMAIL PROVIDER] Dispatching email');
        return true;
    }
}
exports.ConsoleEmailProvider = ConsoleEmailProvider;
exports.defaultEmailProvider = new ConsoleEmailProvider();
