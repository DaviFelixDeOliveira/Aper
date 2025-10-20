create database bd_aper;
use bd_aper;

create table tb_usuario(
cd_usuario int primary key auto_increment,
nm_usuario varchar(45),
nm_sobrenome varchar(45),
nm_email varchar(45),
ft_perfil blob
);
