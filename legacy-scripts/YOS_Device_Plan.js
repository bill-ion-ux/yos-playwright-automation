//YOS-ARS-47
const Util = require('../node_modules/froth-webdriverio-framework/froth_common_actions/Utils');

describe("Device plan selection", () => {
  it("tests Device plan selection", async () => {
   // await browser.setWindowSize(1140, 1020)
    await browser.url("https://yesmy-dev.azurewebsites.net/devices/")
   // await expect(browser).toHaveUrl("https://yesmy-dev.azurewebsites.net/devices/")
    await browser.$("//*[@id=\"device-list-section\"]/div[1]/div/div[2]/p[2]/a").click()
   // await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/samsung-galaxy-a57-5g/cart")
    await browser.$("//*[@id=\"page-main\"]/form/section/div/div/div[2]/div/section[2]/div/div/div/div[3]/ul/li[1]").click()
    await browser.$("aria/24 Months").click()
    await browser.$("//*[@id=\"planBox\"]/div/button/div[2]/ul/li[2]").click()
    await browser.$("aria/SIM card").click()
    await browser.$("aria/NEXT").click()
   // await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/samsung-galaxy-a57-5g/verification")
    await browser.$("#select-securityType").click()
    await browser.$("#select-securityType").setValue("PASSPORT")
    await browser.$("#input-security_id").click()
    await browser.$("#input-security_id").setValue("P5833558")
    await browser.$("#input-name").click()
    await browser.$("#input-name").setValue("TESTUSER")
    await browser.$("#gender1").click()
    await browser.$("#gender1").setValue("1")
    await browser.$("#input-dob").click()
    await browser.$("#input-dob").setValue("06/02/1983")
    await browser.$("#input-contactno").click()
    await browser.$("#input-contactno").setValue("c")
    await browser.$("#input-email").click()
    await browser.$("#input-email").setValue("OBRMEMAIL@")
    await browser.$("#input-email").setValue("OBRMEMAIL@GMAIL.COm")
    await browser.$("//*[@id=\"page-main\"]/form/section[2]/div/div/div/div/div[2]/div/div/div/section[1]/div[2]/div[8]/div/label").click()
    await browser.$("//*[@id=\"page-main\"]/form/section[2]/div/div/div/div/div[2]/div/div/div/section[1]/div[2]/div[9]/div/label").click()
    await browser.$("aria/NEXT").click()
    await browser.$("aria/PROCEED").click()
    await browser.$("#btn-add-to-cart").click()
    //await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/samsung-galaxy-a57-5g/delivery-addresses")
  });
});
