# -*- coding: utf-8 -*-
from setuptools import setup, find_packages

with open('requirements.txt') as f:
	install_requires = f.read().strip().split('\n')

# get version from __version__ variable in grupo_express_it/__init__.py
from grupo_express_it import __version__ as version

setup(
	name='grupo_express_it',
	version=version,
	description='Custom Invoice Tool',
	author='Agile Shift',
	author_email='contacto@gruporeal.org',
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
