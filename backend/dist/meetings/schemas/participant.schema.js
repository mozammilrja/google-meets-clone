"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipantSchema = exports.Participant = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Participant = class Participant {
};
exports.Participant = Participant;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Participant.prototype, "meetingId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Participant.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Participant.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Participant.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'connected' }),
    __metadata("design:type", String)
], Participant.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Participant.prototype, "audio", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Participant.prototype, "video", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Participant.prototype, "screenSharing", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Participant.prototype, "joinedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Participant.prototype, "leftAt", void 0);
exports.Participant = Participant = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        collection: 'participants',
        toJSON: {
            virtuals: true,
            transform: (_doc, ret) => {
                ret.id = ret._id?.toString();
                delete ret._id;
                delete ret.__v;
                return ret;
            }
        }
    })
], Participant);
exports.ParticipantSchema = mongoose_1.SchemaFactory.createForClass(Participant);
//# sourceMappingURL=participant.schema.js.map