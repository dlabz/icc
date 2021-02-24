
## [For this same README.md, but with MathML rendered click here.](https://dlabz.github.io/icc/README.html)
# OKLab color space in CSS using ICC

This is intended as an easy way to edit ICC files.
As ICC is binary file, a parser is needed to build a serializer.

Currently it will synchronously load an external .icc file and partially parse it. Not all properties are supported, as I first need to test the writing part of it.

This library currently requires node.js.
There are no other dependencies.


## *It's not yet ready to be used.*



*A color space by [Björn Ottosson](https://twitter.com/bjornornorn)*

```cpp 
struct RGB {float r; float g; float b;};

Lab linear_srgb_to_oklab(RGB c) 
{
    float l = 0.4121656120f * c.r + 0.5362752080f * c.g + 0.0514575653f * c.b;
    float m = 0.2118591070f * c.r + 0.6807189584f * c.g + 0.1074065790f * c.b;
    float s = 0.0883097947f * c.r + 0.2818474174f * c.g + 0.6302613616f * c.b;

    float l_ = cbrtf(l);
    float m_ = cbrtf(m);
    float s_ = cbrtf(s);

    return {
        0.2104542553f*l_ + 0.7936177850f*m_ - 0.0040720468f*s_,
        1.9779984951f*l_ - 2.4285922050f*m_ + 0.4505937099f*s_,
        0.0259040371f*l_ + 0.7827717662f*m_ - 0.8086757660f*s_,
    };
}

RGB oklab_to_linear_srgb(Lab c) 
{
    float l_ = c.L + 0.3963377774f * c.a + 0.2158037573f * c.b;
    float m_ = c.L - 0.1055613458f * c.a - 0.0638541728f * c.b;
    float s_ = c.L - 0.0894841775f * c.a - 1.2914855480f * c.b;

    float l = l_*l_*l_;
    float m = m_*m_*m_;
    float s = s_*s_*s_;

    return {
        + 4.0767245293f*l - 3.3072168827f*m + 0.2307590544f*s,
        - 1.2681437731f*l + 2.6093323231f*m - 0.3411344290f*s,
        - 0.0041119885f*l - 0.7034763098f*m + 1.7068625689f*s,
    };
}
```
## CIE 1931 color space
https://bottosson.github.io/posts/colorwrong/#what-can-we-do%3F

https://en.wikipedia.org/wiki/CIE_1931_color_space
```cpp
float f(float x)
{
    if (x >= 0.0031308)
        return (1.055) * x^(1.0/2.4) - 0.055
    else
        return 12.92 * x
}

float f_inv(float x)
{
    if (x >= 0.04045)
        return ((x + 0.055)/(1 + 0.055))^2.4
    else 
        return x / 12.92
}
```

Converting from XYZ to Oklab 

Given a color in $XYZ$ coordinates, with a D65 whitepoint, Oklab coordinates can be computed like this:

First the $XYZ$ coordinates are converted to an approximate cone responses:

$\begin{pmatrix} l \\ m \\ s \end{pmatrix} = \mathbf{M_1} \times \begin{pmatrix} X \\ Y \\ Z \end{pmatrix}$

A non-linearity is applied:

$\begin{pmatrix} l' \\ m' \\ s' \end{pmatrix} = \begin{pmatrix} l^{\frac 1 3} \\ m^{\frac 1 3} \\ s^{\frac 1 3} \end{pmatrix}$

Finally, this is transformed into the $Lab$-coordinates:
$\begin{pmatrix} L \\ a \\ b \end{pmatrix} = \mathbf{M_2} \times \begin{pmatrix} l' \\ m' \\ s' \end{pmatrix}$

with the following values for $M1$ and $M2$ :

$\mathbf{M_1} = \begin{bmatrix} +0.8189330101 & +0.3618667424 & -0.1288597137 \\ +0.0329845436 & +0.9293118715 & +0.0361456387 \\ +0.0482003018 & +0.2643662691 & +0.6338517070 \end{bmatrix}$

$\mathbf{M_2} = \begin{bmatrix} +0.2104542553 & +0.7936177850 & -0.0040720468 \\ +1.9779984951 & -2.4285922050 & +0.4505937099 \\ +0.0259040371 & +0.7827717662 & -0.8086757660 \end{bmatrix}$

The inverse operation, going from Oklab to XYZ is done with the following steps:

$\begin{pmatrix} l' \\ m' \\ s' \end{pmatrix} = \mathbf{M_2}^{-1} \times \begin{pmatrix} L \\ a \\ b \end{pmatrix},\qquad \begin{pmatrix} l \\ m \\ s \end{pmatrix} = \begin{pmatrix} {(l')}^{3} \\ {(m')}^{3} \\ {(s')}^{3} \end{pmatrix},\qquad \begin{pmatrix} X \\ Y \\ Z \end{pmatrix} = \mathbf{M_1}^{-1} \times \begin{pmatrix} l \\ m \\ s \end{pmatrix}$



##  note to self

$`\sqrt{2}`$

$$e^{i \pi} = -1$$ 

$$\begin{vmatrix} a & b \\ c & d \end{vmatrix}$$



$\begin{bmatrix}1 \\ 5 \\ -4 \\ 0\end{bmatrix}$
 

$\vec{A}$


# icc

JavaScript module to parse International Color Consortium (ICC) profiles.

## Installation

	npm install icc

## Usage

```javascript
import { parse } from 'icc';
const profileData = fs.readFileSync('sRGB_IEC61966-2-1_black_scaled.icc');
const profile = parse(profileData);
console.dir(profile);
```
outputs:
```
{ version: '2.0',
  intent: 'Perceptual',
  deviceClass: 'Monitor',
  colorSpace: 'RGB',
  connectionSpace: 'XYZ',
  description: 'sRGB IEC61966-2-1 black scaled',
  deviceModelDescription: 'IEC 61966-2-1 Default RGB Colour Space - sRGB',
  viewingConditionsDescription: 'Reference Viewing Condition in IEC 61966-2-1',
  copyright: 'Copyright International Color Consortium'}
```

## API

### parse(data)

Parses `data`, a Buffer containing a raw ICC profile, returning an Object of key/value pairs.

## Licence

Copyright 2015, 2017, 2020 Lovell Fuller

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0.html)

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
