//YOS-ASR-26
const Util = require('../node_modules/froth-webdriverio-framework/froth_common_actions/Utils');

describe('test yes app sim activation', () => {
    it('yes app change env', async () => {
        const el1 = await driver.$("-android uiautomator:new UiSelector().text(\"2025 © YTLC. All Rights Reserved.\")");
await el1.click();
await el1.click();
await el1.click();
await el1.click();
await el1.click();
await el1.click();
await el1.click();
await el1.click();
await el1.click();
await el1.click();

const el2 = await driver.$("id:my.yes.yes4g:id/edt_id_custom_login_dialog");
await el2.addValue("ytladmin");
const el3 = await driver.$("id:my.yes.yes4g:id/edt_password_custom_login_dialog");
await el3.addValue("s8p90=zdErYY+LjLnPcL");
const el4 = await driver.$("id:my.yes.yes4g:id/tv_signin_custom_login_dialog");
await el4.click();

/*To scroll to the down of the screen until text is visible */       
await Util.scrollDownToView("Select Server");

/*const el5 = await driver.$("id:my.yes.yes4g:id/swEnableWallet");
await el5.click();
const el6 = await driver.$("id:my.yes.yes4g:id/swEnableTestEsim");
await el6.click();*/
const el5 = await driver.$("id:my.yes.yes4g:id/tv_title_spinner_item");
await el5.click();
const el6 = await driver.$("-android uiautomator:new UiSelector().text(\"IOT\")");
await el6.click();

const el7 = await driver.$("id:my.yes.yes4g:id/tvApply");
await el7.click();
const el8 = await driver.$("id:android:id/button1");
await el8.click();
const el9 = await driver.$("id:android:id/button1");
await el9.click();
const el10 = await driver.$("accessibility id:Background Image");
await el10.click();
const el11 = await driver.$("//androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View/android.view.View/android.view.View[2]/android.widget.Button");
await el11.click();
const el12 = await driver.$("id:my.yes.yes4g:id/startLayout");
await el12.click();
const el13 = await driver.$("-android uiautomator:new UiSelector().text(\"Manual Enter Code\")");
await el13.click();
const el14 = await driver.$("id:my.yes.yes4g:id/edtEnterSerialNumber");
await el14.addValue("8960152161033238901");

const el15 = await driver.$("//android.widget.TextView[@resource-id='my.yes.yes4g:id/tvContinue']");
await el15.click();

const el16 = await driver.$("id:my.yes.yes4g:id/nextLayout");
await el16.click();

const el17 = await driver.$("accessibility id:Policy Checkbox");
await el17.click();

const el18 = await driver.$("accessibility id:Privacy Policy Checkbox");
await el18.click();

const el19 = await await driver.$("-android uiautomator:new UiSelector().text(\"Passport\")");
await el19.click();

const el20 = await driver.$("id:my.yes.yes4g:id/nextLayout");
await el20.click();

const el21 = await driver.$("id:my.yes.yes4g:id/tv_title_spinner_item");
await el21.click();
 
/*const el22 = await await driver.$("-android uiautomator:new UiSelector().text(\"India\")");
await el22.click();*/

await $('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("India"))').click();

const el23 = await driver.$("id:my.yes.yes4g:id/confirmLayout");
await el23.click();

    });
});
