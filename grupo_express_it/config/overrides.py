from frappe_whatsapp.frappe_whatsapp.doctype.whatsapp_message.whatsapp_message import WhatsAppMessage


class CustomWhatsAppMessage(WhatsAppMessage):

	def notify(self, data):
		# Adding Extra paramenter to add Document Name, so we dont receive a message with Untitled filename
		if self.content_type in ['document']:
			data[self.content_type.lower()]['filename'] = self.filename

		super().notify(data)
