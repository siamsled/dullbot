package com.dullbot.companion

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Programmatic premium layout to bypass complex res XML builds
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            setBackgroundColor(0xFFFAFAFA.toInt())
        }

        val titleView = TextView(this).apply {
            text = "DullBot Companion"
            textSize = 24f
            setTextColor(0xFF1E293B.toInt())
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 48)
        }
        rootLayout.addView(titleView)

        val statusView = TextView(this).apply {
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 48)
        }
        rootLayout.addView(statusView)

        val actionButton = Button(this).apply {
            text = "Grant Notification Access"
            setBackgroundColor(0xFF0F172A.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setPadding(24, 24, 24, 24)
        }
        actionButton.setOnClickListener {
            startActivity(Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"))
        }
        rootLayout.addView(actionButton)

        setContentView(rootLayout)

        // Update active status visual helper
        val isGranted = isNotificationServiceEnabled()
        if (isGranted) {
            statusView.text = "Status: LISTENING ACTIVE\nYour notifications are securely verified."
            statusView.setTextColor(0xFF16A34A.toInt())
            actionButton.text = "Configure Listener Settings"
        } else {
            statusView.text = "Status: ACCESS REQUIRED\nPlease grant listener permissions to verify payments."
            statusView.setTextColor(0xFFDC2626.toInt())
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        if (!TextUtils.isEmpty(flat)) {
            val names = flat.split(":")
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && TextUtils.equals(pkgName, cn.packageName)) {
                    return true
                }
            }
        }
        return false
    }
}
