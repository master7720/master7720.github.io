particlesJS.load('particles-js', 'assets/particles/particles.json', function() {
    console.log('callback - particles.js config loaded')
})

var typed = new Typed('.typewriter', {
    strings: ['Master7720'],
    loop: true,
    backDelay: 5000,
    backSpeed: 25,
    typeSpeed: 25
})

AOS.init()