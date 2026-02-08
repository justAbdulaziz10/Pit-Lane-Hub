'use client';

import { useEffect, useState } from 'react';
import styles from './NotificationBanner.module.css';

export default function NotificationBanner() {
    const [permission, setPermission] = useState('default');
    const [isVisible, setIsVisible] = useState(false);
    const [nextRace, setNextRace] = useState(null);

    useEffect(() => {
        // Check if notifications are supported
        if ('Notification' in window) {
            // Only update if different to avoid strict mode double-invoke issues
            if (Notification.permission !== permission) {
                setPermission(Notification.permission);
            }

            // Show banner if permission not yet decided
            if (Notification.permission === 'default') {
                // Check if user dismissed before
                const dismissed = localStorage.getItem('notificationBannerDismissed');
                if (!dismissed) {
                    setTimeout(() => setIsVisible(true), 3000);
                }
            }
        }

        // Fetch next race info
        fetch('https://api.openf1.org/v1/meetings?year=2026')
            .then(res => res.json())
            .then(data => {
                const now = new Date();
                const upcoming = data.filter(m => new Date(m.date_start) > now);
                if (upcoming[0]) {
                    setNextRace(upcoming[0]);
                }
            })
            .catch(() => { });
    }, []);

    const requestPermission = async () => {
        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                // Show confirmation notification
                new Notification('🏎️ Pit Lane Hub', {
                    body: 'You\'ll receive notifications for race starts!',
                    icon: '/favicon.ico'
                });

                // Save subscription preference
                localStorage.setItem('notificationsEnabled', 'true');
            }

            setIsVisible(false);
        } catch (e) {
            console.error('Notification error:', e);
        }
    };

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem('notificationBannerDismissed', 'true');
    };

    if (!isVisible || permission === 'granted' || permission === 'denied') {
        return null;
    }

    return (
        <div className={styles.banner}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <span className={styles.icon}>🔔</span>
                    <div className={styles.text}>
                        <strong>Never miss a race!</strong>
                        <span>Get notifications when sessions start{nextRace ? ` • Next: ${nextRace.meeting_name}` : ''}</span>
                    </div>
                </div>
                <div className={styles.actions}>
                    <button className={styles.enableBtn} onClick={requestPermission}>
                        Enable Notifications
                    </button>
                    <button className={styles.dismissBtn} onClick={dismiss}>
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
