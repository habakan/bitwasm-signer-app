package com.habakan.bitwasm_signer

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.statusBarColor = Color.BLACK
    window.navigationBarColor = Color.BLACK
    window.decorView.systemUiVisibility = window.decorView.systemUiVisibility and
      View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
    window.decorView.setBackgroundColor(Color.BLACK)
    // Android 15 forces edge-to-edge; earlier versions already lay out below the bars and would pad twice
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content)) { view, insets ->
        val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
        view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
        WindowInsetsCompat.CONSUMED
      }
    }
  }
}
