declare class ParticipantInput {
    email: string;
    role: 'host' | 'participant';
}
declare class MeetingSettingsInput {
    waitingRoomEnabled?: boolean;
    recordingEnabled?: boolean;
    allowGuestJoin?: boolean;
    maxParticipants?: number;
}
export declare class CreateMeetingDto {
    title: string;
    scheduledAt?: string;
    duration?: number;
    participants?: ParticipantInput[];
    settings?: MeetingSettingsInput;
}
export {};
