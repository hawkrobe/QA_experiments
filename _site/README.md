## Coarse-to-fine Inference

[WebPPL](https://github.com/probmods/webppl) is included as a submodule.

Requirements:

- [git](http://git-scm.com/)
- [nodejs](http://nodejs.org)
- [jekyll](http://jekyllrb.com/)

Installation:

    git clone https://github.com/hawkrobe/Q_and_A.git
    cd coarse-to-fine
    git submodule update --init --recursive
    npm install
    npm install -g browserify    
    npm install -g bower
    bower install

Run local webserver:

    jekyll serve --watch --baseurl=''

Pull upstream changes to repo:

    git pull origin gh-pages
    git submodule update --recursive

Update submodule to latest version of webppl and compile webppl for use in browser:

    ./update-webppl
