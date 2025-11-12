from frappe_whatsapp.frappe_whatsapp.doctype.whatsapp_message.whatsapp_message import WhatsAppMessage


class CustomWhatsAppMessage(WhatsAppMessage):

	def notify(self, data):
		# Adding Extra paramenter to add Document Name, so we don't receive a message with attachment as 'Untitled'
		if self.content_type in ['document'] and self.file_name:
			data[self.content_type.lower()]['filename'] = self.file_name

		super().notify(data)
