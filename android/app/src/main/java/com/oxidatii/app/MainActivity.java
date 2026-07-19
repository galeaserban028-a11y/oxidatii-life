package com.oxidatii.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    private static final int OXI_CHROME = Color.parseColor("#0f0d1c");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyNativeChrome();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-apply after splash / plugin changes so bars stay app-colored.
        applyNativeChrome();
    }

    /**
     * Make the system chrome match the app (dark bars, no "browser" look).
     * Note: Android's 3-button nav cannot be removed if the user enabled it —
     * we only theme it so it blends with OXIDAȚII.
     */
    private void applyNativeChrome() {
        Window window = getWindow();
        if (window == null) return;

        // Content stays below status/nav bars (no overlap / crashy inset fights).
        WindowCompat.setDecorFitsSystemWindows(window, true);

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

        window.setStatusBarColor(OXI_CHROME);
        window.setNavigationBarColor(OXI_CHROME);
        window.setBackgroundDrawableResource(R.color.oxi_window_bg);

        View decor = window.getDecorView();
        WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(window, decor);
        if (insets != null) {
            insets.setAppearanceLightStatusBars(false);
            insets.setAppearanceLightNavigationBars(false);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Keep nav bar fully opaque — contrast-enforced translucent bars look "webby".
            window.setNavigationBarContrastEnforced(false);
            window.setStatusBarContrastEnforced(false);
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN
                && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
                Log.i("Google Activity Result", "SocialLogin login handle is null");
                return;
            }
            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
                return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    // Required by Capgo SocialLogin — leave empty.
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
