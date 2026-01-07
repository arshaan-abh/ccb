# Telegram Bot Documentation

This bot manages users based on their balance and allows admins to configure thresholds, manage users, and kick users below the threshold.

# How to Setup

```bash
git clone https://github.com/mahdiyarmeh/lbank-vip.git
```

or unzip the source code

```
cd lbank-vip
```

```
./start
```

- Make sure you have **npm** installed.

# How to Use

1. **Start the Bot**
   `/start`

   Initializes interaction with the bot.  
   If the user is not registered, the bot will ask for their UID.

2. **Set the Threshold (Admin Only)**
   `/setthreshold <amount>`

   Admins set the balance threshold for joining the channel.  
   Example: /setthreshold 100

3. **View Current Threshold (Admin Only)**
   `/threshold`

   Shows the current threshold.

4. **Add New Admin (Admin Only)**
   `/addadmin <telegram_id>`

   Adds a new admin by their Telegram ID.  
   Example: /addadmin 123456

5. **Force Kick Users Below Threshold (Admin Only)**
   `/forcekick`

   Kicks users from the channel who are below the balance threshold.

6. **Bot Statistics (Admin Only)**
   `/stats`

   Displays bot statistics like total users, kicked users, etc.  
   Returns a CSV export of the user database.

7. **Help (Admin Only)**
   `/help`

   Shows list of commands.

8. **Channel Join Event**  
   New members who join the channel are checked against the balance threshold.  
   If their balance is below the threshold, they are kicked.
