/** Stable, locale-neutral canonical route for a driver profile. */
export function driverPath(driver) {
    return driver?.driverId ? `/driver/${encodeURIComponent(driver.driverId)}` : null;
}
