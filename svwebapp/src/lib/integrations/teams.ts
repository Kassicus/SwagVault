interface TeamsMessage {
  title: string;
  text: string;
}

export async function sendTeamsNotification(
  webhookUrl: string,
  message: TeamsMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              type: "AdaptiveCard",
              version: "1.4",
              body: [
                {
                  type: "TextBlock",
                  text: message.title,
                  weight: "Bolder",
                  size: "Medium",
                },
                {
                  type: "TextBlock",
                  text: message.text,
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "Sent via SwagVault",
                  size: "Small",
                  isSubtle: true,
                },
              ],
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
