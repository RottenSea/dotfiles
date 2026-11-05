#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

mocha_green='\[\e[32m\]'
reset='\[\e[0m\]'
PS1="\n${mocha_green}[${reset}\u@\h \W${mocha_green}]${reset}\n\$ "
HISTCONTROL=ignoredups

alias ls='ls --color=auto'
alias grep='grep --color=auto'

shopt -s histappend
source /usr/share/bash-completion/bash_completion

export PATH="$HOME/.local/bin:$PATH"
