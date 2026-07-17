package com.dullbot.companion

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class NotificationService : NotificationListenerService() {

    private val TAG = "DullBotListener"
    // Webhook destination URL. In production, this points to your deployed DullBot URL.
    private val webhookUrl = "http://10.0.2.2:3000/api/payments/sms-webhook" 
    private val appSecret = "dullbot_app_secret_123"

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        try {
            val packageName = sbn.packageName ?: ""
            val extras = sbn.notification.extras ?: return
            val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

            Log.d(TAG, "Notification received from $packageName: Title: $title, Text: $text")

            // Check if this is an SMS notification or direct Mobile Wallet notification banner
            val isSms = packageName.contains("mms") || packageName.contains("messaging") || packageName.contains("sms")
            val isWallet = packageName.contains("bkash") || packageName.contains("nagad") || packageName.contains("rocket")

            if (isSms || isWallet || text.contains("received", ignoreCase = true) || text.contains("CashIn", ignoreCase = true)) {
                Log.i(TAG, "Forwarding payment notification candidate: $text")
                forwardPayload(title, text)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling notification posted event", e)
        }
    }

    private fun forwardPayload(sender: String, body: String) {
        thread {
            var connection: HttpURLConnection? = null
            try {
                val url = URL(webhookUrl)
                connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.setRequestProperty("Accept", "application/json")

                val jsonPayload = """
                    {
                        "sender": "${escapeJson(sender)}",
                        "body": "${escapeJson(body)}",
                        "secret": "$appSecret"
                    }
                """.trimIndent()

                Log.d(TAG, "Sending payload: $jsonPayload")

                val os = connection.outputStream
                val writer = OutputStreamWriter(os, "UTF-8")
                writer.write(jsonPayload)
                writer.flush()
                writer.close()
                os.close()

                val responseCode = connection.responseCode
                val responseMsg = connection.responseMessage
                Log.i(TAG, "Server responded with status: $responseCode - $responseMsg")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to connect and push webhook notification payload", e)
            } finally {
                connection?.disconnect()
            }
        }
    }

    private fun escapeJson(str: String): String {
        return str.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
    }
}
