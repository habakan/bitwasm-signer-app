package app.bithanko.lockdown

import android.app.admin.DeviceAdminReceiver

// Registered as the device owner. Restrictions are applied from MainActivity, not on enabling
class AdminReceiver : DeviceAdminReceiver()
