

const Util = require('../node_modules/froth-webdriverio-framework/froth_common_actions/Utils');

describe("final", () => {
  it("tests final", async () => {
    //await browser.setWindowSize(1525, 946)
    await browser.url("https://yesmy-dev.azurewebsites.net/devices/")
    //await expect(browser).toHaveUrl("https://yesmy-dev.azurewebsites.net/devices/")
    await browser.$("//*[@id=\"device-list-section\"]/div[7]/div/div[2]/p[2]/a").click()
    //await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/samsung-galaxy-z-fold-8-ultra-old-316/cart")
    await browser.$("//*[@id=\"btnCapacity-1\"]/span").click()
    await browser.$("//*[@id=\"page-main\"]/form/section/div/div/div[2]/div/div[2]/div/div/div[1]/div[2]/p").click()
    await browser.$("//*[@id=\"page-main\"]/form/section/div/div/div[2]/div/section[2]/div/div[2]/div").click()
    await browser.$("//*[@id=\"page-main\"]/form/section/div/div/div[2]/div/div[4]/button").click()
    await browser.$("//*[@id=\"planBox\"]/div/button/div[2]/ul").click()
    await browser.$("//*[@id=\"page-main\"]/form/section/div/div/div[2]/div/section[4]/div/div/div/div[1]/button[1]").click()
    await browser.$("#btn-add-to-cart").click()
    //await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/samsung-galaxy-z-fold-8-ultra-old-316/verification")
    await browser.$("#select-securityType").selectByAttribute("value", "MYKAD")
    await browser.$("#input-security_id").click()
    await browser.$("#input-security_id").setValue("050313030143")
    await browser.$("#input-name").click()
    await browser.$("#input-name").setValue("NABIL IRFAN BIN MUHAMAD SAKOWI")
    await browser.$("#input-contactno").click()
    await browser.$("#input-contactno").setValue("0169056557")
    await browser.$("#input-email").click()
    await browser.$("#input-email").setValue("NABILIRFANSAKOWI@GMAIL.COM")
    await browser.$("//*[@id=\"page-main\"]/form/section[2]/div/div/div/div/div[2]/div/div/div/section[1]/div[2]/div[8]/div/label").click()
    await browser.$("//*[@id=\"page-main\"]/form/section[2]/div/div/div/div/div[2]/div/div/div/section[1]/div[2]/div[9]/div/label").click()
    await browser.$("aria/NEXT").click()

    await browser.$("//*[@id=\"btn-add-to-cart\"]/span[2]").click()
    //await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/samsung-galaxy-z-fold-8-ultra-old-316/accessories")
    await browser.$("#btn-add-to-cart").click()
    await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/samsung-galaxy-z-fold-8-ultra-old-316/delivery-addresses")
    await browser.$("#input-address").click()
    await browser.$("#input-address").setValue("11, Jln Pantai Sentral 3 Pantai Sentral")
    await browser.$("#input-postcode").setValue("59200")
    await browser.$("#btn-add-to-cart").click()
    await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/samsung-galaxy-z-fold-8-ultra-old-316/payment")
    await browser.$("#btn-add-to-cart").click()
  });
});
// around 2-3 minutes for me to write the script using webdriverio
// stuck around 2 hours to debug the script, because the selectors are not stable 
// use the browser element as a selector instead of the given path from recorder
// the script takes around 1 minute to run 
