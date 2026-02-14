export declare class JoinMeetingDto {
    meetingId: string;
    participantId: string;
    name?: string;
}
export declare class LeaveMeetingDto {
    meetingId: string;
    participantId: string;
}
export declare class OfferDto {
    meetingId: string;
    participantId: string;
    targetParticipantId: string;
    sdp: any;
}
export declare class AnswerDto {
    meetingId: string;
    participantId: string;
    targetParticipantId: string;
    sdp: any;
}
export declare class IceCandidateDto {
    meetingId: string;
    participantId: string;
    targetParticipantId: string;
    candidate: any;
}
export declare class MediaStateDto {
    meetingId: string;
    participantId: string;
    audio?: boolean;
    video?: boolean;
    screenSharing?: boolean;
}
export declare class MeetingStateSyncDto {
    meetingId: string;
}
export declare class SendMessageDto {
    meetingId: string;
    participantId: string;
    participantName: string;
    message: string;
}
