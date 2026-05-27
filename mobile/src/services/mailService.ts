import api from "./api";


export const mailService = {
	async sendInterviewInvite({ email, subject, content }: { email: string; subject: string; content: string }) {
		const res = await api.post('/mail/send-interview-invite', {
			email,
			subject,
			content,
		});
		return res.data;
	},
};
