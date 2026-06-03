import { test, expect, _electron } from "@playwright/test";

let electronApp: Awaited<ReturnType<typeof _electron.launch>>;
let mainPage: Awaited<ReturnType<typeof electronApp.firstWindow>>;

async function waitForPreloadScript() {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const electronBridge = await mainPage.evaluate(() => {
        return (window as Window & { electron?: any }).electron;
      });
      if (electronBridge) {
        clearInterval(interval);
        resolve(true);
      }
    }, 100);
  });
}

test.beforeEach(async () => {
  electronApp = await _electron.launch({
    args: ["."],
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
  });

  // Monkey-patch minimize in the main process to track state changes in headless environments (like Xvfb)
  await electronApp.evaluate((electron) => {
    const { BrowserWindow } = electron;
    const originalMinimize = BrowserWindow.prototype.minimize;
    BrowserWindow.prototype.minimize = function (this: any) {
      this.__minimizedForTest = true;
      originalMinimize.call(this);
    };
  });

  mainPage = await electronApp.firstWindow();
  await waitForPreloadScript();
});

test.afterEach(async () => {
  await electronApp.close();
});

test("custom frame should minimize the mainWindow", async () => {
  await mainPage.click("#minimize");

  await expect
    .poll(async () => {
      return await electronApp.evaluate((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        return win.isMinimized() || (win as any).__minimizedForTest;
      });
    })
    .toBeTruthy();
});

test("should create a custom menu", async () => {
  const menu = await electronApp.evaluate((electron) => {
    return electron.Menu.getApplicationMenu();
  });
  expect(menu).not.toBeNull();
  expect(menu?.items).toHaveLength(2);
  expect(menu?.items[0].submenu?.items).toHaveLength(2);
  expect(menu?.items[1].submenu?.items).toHaveLength(3);
  expect(menu?.items[1].label).toBe("View");
});
