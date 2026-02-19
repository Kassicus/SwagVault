interface SlackMessage {
  title: string;
  text: string;
  color?: string;
}

export async function sendSlackNotification(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: message.title,
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message.text,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "Sent via SwagVault",
              },
            ],
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
