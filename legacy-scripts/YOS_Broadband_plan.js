//YOS-ASR-43

const Util = require('../node_modules/froth-webdriverio-framework/froth_common_actions/Utils');

describe("Broadband Revamp", () => {
  it("tests Broadband Revamp", async () => {
    clevertap.getCleverTapID()
 
    const cleverTapId = await browser.execute(() => {

    return clevertap.getCleverTapID();

});
 
console.log("CleverTap ID:", cleverTapId);
 
    await browser.$("div:nth-of-type(1) > ul:nth-of-type(3) > li > a").click()
    await browser.$("//ul[3]/li/ul/div/div[1]/div[1]/ul/li[2]/a").click()
    await Util.scrollIntoView("//*[@id='thirty-six-month']/div/div[2]/a");
    await browser.$("//*[@id='thirty-six-month']/div/div[2]/a").click()
    //await browser.$("aria/24 Months").click()
    await browser.$("//*[@id='page-main']/form/section/div[2]/div/div[2]/div[4]/button").click()
    await browser.$("#select-securityType").click();
    await Util.selectDropDownValue("#select-securityType", 'PASSPORT');
    await browser.$("#input-security_id").click();
    await browser.$("#input-security_id").setValue("T7555901")
    await browser.$("#input-name").click()
    await browser.$("#input-name").setValue("TEST USER")
    await Util.scrollIntoView("//*[@id='gender']");
    await Util.selectDropDownText('#gender', 'MALE');
    await browser.$("#input-dob").click()
    await browser.$("#input-dob").setValue("26/09/1998")
    await browser.$("#input-contactno").click()
    await browser.$("#input-contactno").setValue("0149645779")
    await browser.$("#input-email").click()
    await browser.$("#input-email").setValue("OBRMEMAIL@GMAIL.COm")
    await browser.$("//*[@id=\"page-main\"]/form/section[2]/div/div/div/div/div[2]/div/div/div/section[1]/div[2]/div[8]/div/label").click()
    await browser.$("//*[@id=\"page-main\"]/form/section[2]/div/div/div/div/div[2]/div/div/div/section[1]/div[2]/div[9]/div/label").click()
    await browser.$("//*[@id='page-main']/form/div/div/div[2]/div[4]/button").click()
    //await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/broadband/addons")
    await browser.$("//*[@id='page-main']/form/section[2]/div/div/div/div/div[1]/div/div[2]/div[4]/button").click()
    //await expect(browser).toHaveUrl("https://yesshop-dev.azurewebsites.net/broadband/delivery-addresses")

    await browser.$("#input-email").click()
    await browser.$("#input-email").setValue("OBRMEMAIL@GMAIL.COM")

    await browser.$("#input-address").click()
    await browser.$("#input-address").setValue("YTLC DATA CENTER")

    await Util.scrollIntoView("#input-unit_no");
    await browser.$("#input-unit_no").click()
    await browser.$("#input-unit_no").setValue("1")

    await Util.scrollIntoView("//*[@id='input-postcode']");
    await browser.$("//*[@id='input-postcode']").click()
    await browser.$("//*[@id='input-postcode']").setValue("51200")
    
    await browser.$("//*[@id='page-main']/form/div/div/div[2]/div[4]/button").click()
    await browser.pause(5000)
    
    
   await browser.$("//label[text()='Online Banking (FPX)']").click()
    
    await Util.scrollIntoView("//*[@id='select-bank']");
    //await browser.$("#bb-select-bank").click()
     // const selectBox2 = await $('#bb-select-bank');
      //wait selectBox2.selectByVisibleText('SBI Bank A')
      
      await Util.selectDropDownText('//*[@id="select-bank"]', 'SBI Bank A');
    
    //Pay now button  
    await browser.$("//*[@id='page-main']/form/section[2]/div/div/div/div/div[1]/div/div/div[1]/div/div/div[4]/div[8]/button").click()
   
   
    await Util.switchToWindowByIndex(1);

    // const windows = await browser.getWindowHandles();
    // for (let window of windows) {
    //   if (window !== parentWindow) {
    //     await browser.switchToWindow(window);
    //     if ((await browser.getTitle()).includes("M1")) {
    await $('#userId').setValue("1234");
    await $('#password').setValue("1234");
    await browser.$("/html/body/div/div[2]/form/div/div[2]/button[1]").click()
    /* Pause for some milliseconds */ 
    await browser.pause(5000)
  
    await browser.$("/html/body/div/div[2]/form/div/div[2]/select").click()
    await browser.$("/html/body/div/div[2]/form/div/div[2]/button[1]").click()      
         
    await Util.switchToWindowByIndex(0);
       await browser.pause(5000)
      
      const ele_successful = await $("//h2[text()='Thank you!']")
     //await ele_successful.waitUntil(async function () {
        //return (await this.getText()) === 'Thank you!'
   // }, {
       // timeout: 30000,
        //timeoutMsg: 'payment is taking more than expected time'
    //})
      
   //const orderNumber = await browser.$("//p[@class='panel-orderNumber']").getText(); 
   // BUFFER.setItem('Order_Num', 'orderNumber')
    
  });
});

