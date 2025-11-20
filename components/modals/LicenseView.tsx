import React from 'react';
import './LicenseView.css';

interface LicenseViewProps {
    onBack: () => void;
}

export const LicenseView: React.FC<LicenseViewProps> = ({ onBack }) => {
    return (
        <div className="license-view">
            <button className="license-back-button" onClick={onBack}>&larr; Back to Shortcuts</button>
            
            <h2>OVERVIEW OF LICENSES USED IN SHADER CODE</h2>
            
            <p className="license-intro">
                The purpose of this document is to provide an overview of the license agreements and copyright statements found in the comments and headers of third-party shader codes integrated into the project.
            </p>

            <div className="license-section">
                <h3>I. Open Source Licenses (FOSS)</h3>
                <div className="license-table license-table-4-col">
                    <div className="license-table-header">License</div>
                    <div className="license-table-header">Author/Origin</div>
                    <div className="license-table-header">Description of Use</div>
                    <div className="license-table-header">Compliance Requirements</div>

                    <div><strong>MIT License</strong></div>
                    <div><strong>Ashima Arts</strong></div>
                    <div>Code for 2D/3D/4D Simplex noise functions.</div>
                    <div>Requires preservation of the copyright notice (Copyright (C) 2011 Ashima Arts) and the MIT license.</div>

                    <div><strong>MIT License</strong></div>
                    <div><strong>Inigo Quilez (iQ)</strong></div>
                    <div>Distance functions and intersections (e.g., `rayCylinder`, 2D `box`, `pmin`, `rayPlane`, `raySphere`, `torusNormal`).</div>
                    <div>Requires attribution to the author and preservation of the license agreement.</div>

                    <div><strong>MIT License</strong></div>
                    <div><strong>Pascal Gilcher</strong></div>
                    <div>Function for approximating the arctangent function (`atan_approx`).</div>
                    <div>Requires attribution to the author and preservation of the license agreement.</div>

                    <div><strong>MIT OR CC-BY-NC-4.0</strong></div>
                    <div><strong>mercury (HG SDF)</strong></div>
                    <div>Modification functions (e.g., `mod1`, `modMirror1`, `modMirror2`).</div>
                    <div>Allows a choice between MIT and CC BY-NC 4.0 (non-commercial). For commercial use, MIT must be chosen and its conditions met.</div>

                    <div><strong>WTFPL</strong></div>
                    <div><strong>sam hocevar</strong></div>
                    <div>Functions and macros for converting colors from HSV to RGB (`hsv2rgb`, `HSV2RGB`).</div>
                    <div>This is a very permissive license that essentially allows any use. Attribution to the author is part of the found comment.</div>
                    
                    <div><strong>CC BY-SA 4.0</strong></div>
                    <div><strong>TinyTexel</strong></div>
                    <div>Shader "oOoOoOoOoOoOoOoOoOoOoOoOoOoOoOo".</div>
                    <div><strong>Requires attribution to the author</strong> and sharing of all <strong>derivative works under the same license</strong> (ShareAlike), even for commercial use.</div>
                </div>
            </div>

            <div className="license-section">
                <h3>II. Free to Use Licenses (CC0 / Public Domain)</h3>
                 <div className="license-table license-table-3-col">
                    <div className="license-table-header">Declaration</div>
                    <div className="license-table-header">Author/Origin</div>
                    <div className="license-table-header">Example Shaders (per comments)</div>

                    <div><strong>CC0</strong></div>
                    <div><strong>Anon., Dave Hoskins</strong></div>
                    <div>Shader "We need an expert.. Dave Hoskins".</div>

                     <div><strong>CC0</strong></div>
                    <div><strong>Anon.</strong></div>
                    <div>Shaders: "ComplicatedThings", "Gravity sucks", "Logarithmic spirals tweaked", "Logarithmic spiral of spheres", "Refraction "madness"", "Saturday Torus", "Sea and moon", "Voronoi Glass Panes".</div>
                    
                    <div><strong>CC0</strong></div>
                    <div><strong>Anon., knighty, shane</strong></div>
                    <div>Shader "Time for some inner reflections".</div>

                    <div><strong>CC0</strong></div>
                    <div><strong>Anon., Evilryu</strong></div>
                    <div>Shader "Inside the mandelbulb".</div>
                    
                    <div><strong>CC0</strong></div>
                    <div><strong>Scry</strong></div>
                    <div>Shader "Mind flowers".</div>

                    <div><strong>CC0</strong></div>
                    <div><strong>Anon., Mårten Rånge</strong></div>
                    <div>Shader "Happy little windows terminal".</div>

                    <div><strong>Public Domain</strong></div>
                    <div><strong>Anon.</strong></div>
                    <div>Various hashing and utility functions explicitly marked with `// License: Unknown, author: Unknown, found: don't remember`.</div>
                </div>
            </div>

            <div className="license-section">
                <h3>III. Code with Unknown License but Clear Attribution</h3>
                 <div className="license-table license-table-4-col">
                    <div className="license-table-header">Code/Function</div>
                    <div className="license-table-header">Author</div>
                    <div className="license-table-header">Source (for verification)</div>
                    <div className="license-table-header">License Note</div>

                    <div><strong>ACES Tonemapping</strong> (`aces_approx`)</div>
                    <div><strong>Matt Taylor</strong> (GitHub: @64)</div>
                    <div>`https://64.github.io/tonemapping/`</div>
                    <div><strong>License Unknown</strong>.</div>

                    <div><strong>sRGB conversion</strong> (`sRGB` / `sRGB(vec3)`)</div>
                    <div><strong>nmz</strong> (Twitter: @stormoid)</div>
                    <div>`https://www.shadertoy.com/view/NdfyRM`</div>
                    <div><strong>License Unknown</strong>.</div>

                    <div><strong>Polyhedral folding</strong> (`poly_fold`, poly const.)</div>
                    <div><strong>knighty</strong></div>
                    <div>`https://www.shadertoy.com/view/MsKGzw`</div>
                    <div><strong>License Unknown</strong>.</div>

                    <div><strong>MandelBulb DF</strong> (`mandelBulb`)</div>
                    <div><strong>EvilRyu</strong></div>
                    <div>`https://www.shadertoy.com/view/MdXSWn`</div>
                    <div><strong>License Unknown</strong>.</div>

                    <div><strong>Tanh Approximation</strong> (`tanh_approx`)</div>
                    <div><strong>Claude Brezinski</strong></div>
                    <div>`https://mathr.co.uk/blog/2017-09-06_approximating_hyperbolic_tangent.html`</div>
                    <div><strong>License Unknown</strong> (One of several versions in the code).</div>

                    <div><strong>`kishimisu`</strong></div>
                    <div><strong>kishimisu</strong></div>
                    <div>`https://www.shadertoy.com/view/mtyGWy`</div>
                    <div><strong>License Unknown</strong>.</div>
                </div>
            </div>
            <p className="license-footer-note">
                Shaders are an optional part of the application. The purpose of this document is to provide an overview of the license agreements and copyright statements of third-party shader codes optionally integrated into the project.
            </p>
        </div>
    );
};