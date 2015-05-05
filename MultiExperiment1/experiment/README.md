Note: This is an unofficial fork of [MWERT](https://github.com/hawkrobe/MWERT), adapted to allow arbitrary numbers of players to join a single room and participate in a collective behavior task. This task was originally used by Ian Couzin's lab to investigate collective behavior in fish.

Local demo (from scratch)
=========================

1. Git is a popular version control and source code management system. If you're new to git, you'll need to install the latest version by following the link for [Mac](http://sourceforge.net/projects/git-osx-installer/) or [Windows](http://msysgit.github.io/) and downloading the first option in the list. On Mac, this will give you a set of command-line tools (restart the terminal if the git command is still not found after installation). On Windows it will give you a shell to type commands into. For Linux users, more information can be found [here](http://git-scm.com/book/en/Getting-Started-Installing-Git).

2. On Mac or Linux, use the Terminal to navigate to the location where you want to create your project, and enter 
   ```
   git clone https://github.com/hawkrobe/couzin_replication.git
   ```
   at the command line to create a local copy of this repository. On Windows, run this command in the shell you installed in the previous step.

3. Install node and npm (the node package manager) on your machine. Node.js sponsors an [official download](http://nodejs.org/download/) for all systems. For an advanced installation, there are good instructions [here](https://gist.github.com/isaacs/579814).

4. Navigate into the repository you created. You should see a file called package.json, which contains the dependencies. To install these dependencies, enter ```npm install``` at the command line. This may take a few minutes.

5. Finally, to run the experiment, enter ```node app.js``` at the command line. You should expect to see the following message:
   ```
   info  - socket.io started
       :: Express :: Listening on port 8888
   ```
   This means that you've successfully created a 'server' that can be accessed by copying and pasting 
   ```
   http://localhost:8888/index.html
   ```
   in one tab of your browser. You should see an avatar in a waiting room. To connect the other player in another tab for test purposes, open a new tab and use the same URL. Repeat as many times as you'd like!
